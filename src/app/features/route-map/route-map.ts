import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import * as L from 'leaflet';
import { Split } from '../../core/model/types';
import { DistanceUnit, UNIT_LENGTH_M } from '../../core/model/units';
import { interpolateSeries } from '../../core/route/resampling';
import { ProfilePoint } from '../../core/route/types';
import { PreferencesService } from '../../shared/preferences.service';
import { PlannerStore } from '../../state/planner.store';

const OSM_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

@Component({
  selector: 'app-route-map',
  template: `
    <section aria-labelledby="map-heading">
      <h2 id="map-heading" class="heading" i18n>Percurso</h2>
      <div
        #host
        class="map"
        role="region"
        aria-label="Mapa do percurso com marcadores a cada km ou milha"
        i18n-aria-label
      ></div>
    </section>
  `,
  styleUrl: './route-map.scss',
  // Leaflet creates its own DOM, so styles must reach it without view encapsulation.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteMap {
  private readonly store = inject(PlannerStore);
  private readonly preferences = inject(PreferencesService);
  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private readonly ready = signal(false);
  private map?: L.Map;
  private routeLayer = L.layerGroup();
  private selectionLayer = L.layerGroup();
  /** Split markers by split index, to highlight the selected one. */
  private splitMarkers = new Map<number, L.Marker>();

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const map = L.map(this.host().nativeElement, {
        scrollWheelZoom: false,
        zoomSnap: 0.25,
      });
      map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: OSM_ATTRIBUTION,
      }).addTo(map);
      this.routeLayer.addTo(map);
      this.selectionLayer.addTo(map);
      this.map = map;

      const resizeObserver = new ResizeObserver(() => map.invalidateSize());
      resizeObserver.observe(this.host().nativeElement);
      destroyRef.onDestroy(() => {
        resizeObserver.disconnect();
        map.remove();
      });
      this.ready.set(true);
    });

    effect(() => {
      const points = this.store.profile()?.points;
      const unit = this.preferences.unit();
      if (!this.ready() || !this.map || !points) return;
      this.drawRoute(this.map, points, unit);
    });

    effect(() => {
      const points = this.store.profile()?.points;
      const index = this.store.selectedSplit();
      const split = index ? this.store.estimate()?.splits[index - 1] : undefined;
      if (!this.ready() || !this.map || !points) return;
      this.drawSelection(this.map, points, split);
    });
  }

  private drawRoute(map: L.Map, points: ProfilePoint[], unit: DistanceUnit): void {
    this.routeLayer.clearLayers();
    this.splitMarkers.clear();
    const latLngs = points.map((p) => L.latLng(p.lat, p.lon));
    const line = L.polyline(latLngs, { className: 'route-line', interactive: false });
    this.routeLayer.addLayer(line);

    // One marker where each km or mile ends; mile marks fall between grid points.
    const unitM = UNIT_LENGTH_M[unit];
    const totalM = points[points.length - 1].distanceM;
    const marksM: number[] = [];
    for (let d = unitM; d < totalM - 1e-6; d += unitM) marksM.push(d);
    const markPoints = positionsAt(points, marksM);

    markPoints.forEach((position, i) => {
      const index = i + 1;
      const marker = L.marker(position, {
        icon: L.divIcon({ className: 'split-marker', html: String(index), iconSize: [24, 24] }),
        keyboard: true,
        title: unit === 'mi' ? $localize`Milha ${index}` : $localize`Km ${index}`,
      });
      // The marker sits where split `index` ends.
      marker.on('click', () => this.store.toggleSplit(index));
      this.routeLayer.addLayer(marker);
      this.splitMarkers.set(index, marker);
    });

    const start = points[0];
    const finish = points[points.length - 1];
    this.routeLayer.addLayer(this.endpoint(start, 'start', $localize`Largada`));
    this.routeLayer.addLayer(this.endpoint(finish, 'finish', $localize`Chegada`));

    map.fitBounds(line.getBounds(), { padding: [24, 24] });
  }

  /**
   * Highlights a split: the rest of the route fades, the split is drawn in full
   * ink over a background-colored casing, and its end marker is inverted.
   */
  private drawSelection(map: L.Map, points: ProfilePoint[], split: Split | undefined): void {
    this.selectionLayer.clearLayers();
    this.host().nativeElement.classList.toggle('has-selection', !!split);
    for (const [index, marker] of this.splitMarkers) {
      marker.getElement()?.classList.toggle('selected', index === split?.index);
    }
    if (!split) return;

    const startM = split.startM;
    const endM = split.startM + split.distanceM;
    const [start, end] = positionsAt(points, [startM, endM]);
    const inside = points
      .filter((p) => p.distanceM > startM && p.distanceM < endM)
      .map((p) => L.latLng(p.lat, p.lon));
    const latLngs = [start, ...inside, end];

    const casing = L.polyline(latLngs, { className: 'route-line-casing', interactive: false });
    const line = L.polyline(latLngs, { className: 'route-line-selected', interactive: false });
    this.selectionLayer.addLayer(casing);
    this.selectionLayer.addLayer(line);
    if (!map.getBounds().contains(line.getBounds())) map.panTo(line.getBounds().getCenter());
  }

  private endpoint(point: ProfilePoint, kind: 'start' | 'finish', title: string): L.Marker {
    return L.marker([point.lat, point.lon], {
      icon: L.divIcon({ className: `endpoint-marker ${kind}`, iconSize: [14, 14] }),
      title,
      interactive: false,
    });
  }
}

/** Map positions at the given distances along the profile, interpolated between points. */
function positionsAt(points: ProfilePoint[], distancesM: number[]): L.LatLng[] {
  const fromM = points.map((p) => p.distanceM);
  const lats = interpolateSeries(
    fromM,
    points.map((p) => p.lat),
    distancesM,
  );
  const lons = interpolateSeries(
    fromM,
    points.map((p) => p.lon),
    distancesM,
  );
  return distancesM.map((_, i) => L.latLng(lats[i], lons[i]));
}
