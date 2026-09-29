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
} from '@angular/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, MarkAreaComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsCoreOption } from 'echarts/core';
import { Estimate, Split } from '../../core/model/types';
import { DistanceUnit, UNIT_LENGTH_M } from '../../core/model/units';
import { ProfilePoint } from '../../core/route/types';
import { formatDuration, formatNumber, formatPace } from '../../shared/formatters';
import { PreferencesService } from '../../shared/preferences.service';
import { readThemeColors, ThemeColors } from '../../shared/theme-colors';
import { ThemeService } from '../../shared/theme.service';
import { PlannerStore } from '../../state/planner.store';

echarts.use([LineChart, GridComponent, TooltipComponent, MarkAreaComponent, CanvasRenderer]);

const MONO = "'JetBrains Mono', ui-monospace, monospace";
const SANS = 'Inter, system-ui, sans-serif';

@Component({
  selector: 'app-elevation-chart',
  template: `
    <section aria-labelledby="chart-heading">
      <h2 id="chart-heading" class="heading" i18n>Altimetria e pace</h2>
      <div
        #host
        class="chart"
        role="img"
        aria-label="Gráfico da elevação ao longo do percurso, com o pace alvo de cada parcial em degraus"
        i18n-aria-label
      ></div>
    </section>
  `,
  styles: `
    h2 {
      margin-bottom: var(--space-6);
    }
    .chart {
      height: 320px;
    }
    @media (max-width: 720px) {
      .chart {
        height: 260px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElevationChart {
  private readonly store = inject(PlannerStore);
  private readonly theme = inject(ThemeService);
  private readonly preferences = inject(PreferencesService);
  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private readonly ready = signal(false);
  private chart?: echarts.ECharts;

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const element = this.host().nativeElement;
      const chart = echarts.init(element);
      this.chart = chart;

      chart.getZr().on('click', (event) => {
        const splits = this.store.estimate()?.splits ?? [];
        const point = [event.offsetX, event.offsetY];
        if (!chart.containPixel({ gridIndex: 0 }, point)) return;
        // The x axis is in the user's unit, so each whole number is one split.
        const [x] = chart.convertFromPixel({ gridIndex: 0 }, point) as number[];
        const index = Math.min(Math.floor(x) + 1, splits.length);
        if (index >= 1) this.store.toggleSplit(index);
      });

      const resizeObserver = new ResizeObserver(() => chart.resize());
      resizeObserver.observe(element);
      destroyRef.onDestroy(() => {
        resizeObserver.disconnect();
        chart.dispose();
      });
      this.ready.set(true);
    });

    effect(() => {
      const profile = this.store.profile();
      const estimate = this.store.estimate();
      const selectedSplit = this.store.selectedSplit();
      const unit = this.preferences.unit();
      this.theme.theme(); // re-read the tokens when the theme changes
      // Without an estimate (reference race missing) the chart shows the elevation alone.
      if (!this.ready() || !this.chart || !profile) return;

      const colors = readThemeColors(this.host().nativeElement);
      const option = buildOption(profile.points, estimate, selectedSplit, unit, colors);
      this.chart.setOption(option, { notMerge: true });
    });
  }
}

function buildOption(
  points: ProfilePoint[],
  estimate: Estimate | null,
  selectedSplit: number | null,
  unit: DistanceUnit,
  c: ThemeColors,
): EChartsCoreOption {
  // Both axes use the user's unit: distance in km or mi, pace in seconds per km or mi,
  // so ticks land on round values either way.
  const unitM = UNIT_LENGTH_M[unit];
  const perUnit = (paceSPerKm: number) => (paceSPerKm * unitM) / 1000;
  const splits = estimate?.splits ?? [];
  const total = (points[points.length - 1]?.distanceM ?? 0) / unitM;
  const elevation = points.map((p) => [p.distanceM / unitM, p.elevationM]);

  const axisLabel = { color: c.inkSubtle, fontFamily: MONO, fontSize: 11 };
  const axisName = {
    color: c.inkSubtle,
    fontFamily: SANS,
    fontSize: 11,
    fontWeight: 600,
  };
  const selected = selectedSplit ? splits[selectedSplit - 1] : undefined;
  const pace = splits.length > 0 ? paceSeries(splits, total, unit, selected, c) : null;

  return {
    animationDuration: 200,
    animationDurationUpdate: 180,
    textStyle: { fontFamily: SANS, color: c.ink },
    // ECharts 6 keeps axis labels inside the container (outerBoundsMode 'auto').
    grid: { left: 8, right: 8, top: 40, bottom: 8 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: c.surface,
      borderColor: c.line,
      borderWidth: 1,
      padding: [8, 12],
      extraCssText: 'border-radius: 4px; box-shadow: none;',
      textStyle: { color: c.ink, fontFamily: MONO, fontSize: 12 },
      axisPointer: { type: 'line', lineStyle: { color: c.ink, width: 1 } },
      formatter: (params: { axisValue: number; seriesIndex: number; value: number[] }[]) => {
        const x = params[0]?.axisValue ?? 0;
        const elevationM = params.find((p) => p.seriesIndex === 0)?.value[1];
        const split = splits[Math.min(Math.floor(x), splits.length - 1)];
        return [
          `${unit} ${formatNumber(x, 2)}`,
          elevationM === undefined ? '' : `${formatNumber(elevationM)} m`,
          split ? `${formatPace(split.paceSPerKm, unit)} /${unit}` : '',
        ]
          .filter(Boolean)
          .join('<br>');
      },
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: total,
      interval: total > 25 ? 5 : total > 12 ? 2 : 1,
      axisLine: { lineStyle: { color: c.ink } },
      axisTick: { lineStyle: { color: c.ink } },
      axisLabel: { ...axisLabel, formatter: (v: number) => formatNumber(v) },
      splitLine: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        name: $localize`ELEVAÇÃO (M)`,
        nameTextStyle: { ...axisName, align: 'left' },
        scale: true,
        axisLabel: { ...axisLabel, formatter: (v: number) => formatNumber(v) },
        splitLine: { lineStyle: { color: c.line } },
      },
      ...(pace
        ? [
            {
              type: 'value',
              name: $localize`PACE (MIN/${unit.toUpperCase()}:unit:)`,
              // The axis is inverted (faster on top), so its start is the top.
              nameLocation: 'start',
              nameTextStyle: { ...axisName, align: 'right' },
              inverse: true,
              ...pace.bounds,
              // Values are already seconds per unit: format as plain m:ss.
              axisLabel: { ...axisLabel, formatter: (v: number) => formatDuration(v) },
              splitLine: { show: false },
            },
          ]
        : []),
    ],
    series: [
      {
        type: 'line',
        data: elevation,
        yAxisIndex: 0,
        showSymbol: false,
        lineStyle: { color: c.inkMuted, width: 1 },
        areaStyle: { color: c.surfaceStrong, opacity: 1 },
        emphasis: { disabled: true },
      },
      ...(pace ? [pace.series] : []),
    ],
  };
}

/** Pace step line on a second, inverted axis, with the selected split marked. */
function paceSeries(
  splits: Split[],
  total: number,
  unit: DistanceUnit,
  selected: Split | undefined,
  c: ThemeColors,
) {
  const unitM = UNIT_LENGTH_M[unit];
  const perUnit = (paceSPerKm: number) => (paceSPerKm * unitM) / 1000;

  // Step line: each split holds its pace from its start to the next start.
  const steps = splits.map((s) => [s.startM / unitM, perUnit(s.paceSPerKm)]);
  steps.push([total, perUnit(splits[splits.length - 1].paceSPerKm)]);

  // Bounds aligned to the tick interval, so the first and last labels do not overlap.
  const paces = splits.map((s) => perUnit(s.paceSPerKm));
  const range = Math.max(...paces) - Math.min(...paces);
  const interval = range > 120 ? 60 : range > 50 ? 30 : range > 20 ? 15 : 5;
  const bounds = {
    min: Math.floor((Math.min(...paces) - 5) / interval) * interval,
    max: Math.ceil((Math.max(...paces) + 5) / interval) * interval,
    interval,
  };

  const series = {
    type: 'line',
    data: steps,
    yAxisIndex: 1,
    step: 'end',
    showSymbol: false,
    lineStyle: { color: c.ink, width: 2 },
    emphasis: { disabled: true },
    markArea: selected
      ? {
          silent: true,
          itemStyle: { color: c.ink, opacity: 0.12 },
          data: [
            [
              { xAxis: selected.startM / unitM },
              { xAxis: (selected.startM + selected.distanceM) / unitM },
            ],
          ],
        }
      : undefined,
  };
  return { bounds, series };
}
