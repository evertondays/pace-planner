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
import { ProfilePoint } from '../../core/route/types';
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
        aria-label="Mapa do percurso com marcadores a cada km"
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
  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private readonly ready = signal(false);
  private map?: L.Map;
  private routeLayer = L.layerGroup();
  private selectionLayer = L.layerGroup();

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
      if (!this.ready() || !this.map || !points) return;
      this.drawRoute(this.map, points);
    });

    effect(() => {
      const points = this.store.profile()?.points;
      const selectedKm = this.store.selectedKm();
      if (!this.ready() || !this.map || !points) return;
      this.drawSelection(this.map, points, selectedKm);
    });
  }

  private drawRoute(map: L.Map, points: ProfilePoint[]): void {
    this.routeLayer.clearLayers();
    const latLngs = points.map((p) => L.latLng(p.lat, p.lon));
    const line = L.polyline(latLngs, { className: 'route-line', interactive: false });
    this.routeLayer.addLayer(line);

    for (const point of points) {
      const km = Math.round(point.distanceM / 1000);
      if (km === 0 || Math.abs(point.distanceM - km * 1000) > 1e-6) continue;
      const marker = L.marker([point.lat, point.lon], {
        icon: L.divIcon({ className: 'km-marker', html: String(km), iconSize: [24, 24] }),
        keyboard: true,
        title: $localize`Km ${km}`,
      });
      // The marker sits where km `km` ends.
      marker.on('click', () => this.store.toggleKm(km));
      this.routeLayer.addLayer(marker);
    }

    const start = points[0];
    const finish = points[points.length - 1];
    this.routeLayer.addLayer(this.endpoint(start, 'start', $localize`Largada`));
    this.routeLayer.addLayer(this.endpoint(finish, 'finish', $localize`Chegada`));

    map.fitBounds(line.getBounds(), { padding: [24, 24] });
  }

  private drawSelection(map: L.Map, points: ProfilePoint[], selectedKm: number | null): void {
    this.selectionLayer.clearLayers();
    if (!selectedKm) return;

    const startM = (selectedKm - 1) * 1000;
    const endM = selectedKm * 1000;
    const kmPoints = points.filter(
      (p) => p.distanceM >= startM - 1e-6 && p.distanceM <= endM + 1e-6,
    );
    if (kmPoints.length < 2) return;

    const line = L.polyline(
      kmPoints.map((p) => L.latLng(p.lat, p.lon)),
      { className: 'route-line-selected', interactive: false },
    );
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
