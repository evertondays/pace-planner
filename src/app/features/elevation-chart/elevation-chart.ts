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
import { Estimate } from '../../core/model/types';
import { ProfilePoint } from '../../core/route/types';
import { formatNumber, formatPace } from '../../shared/formatters';
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
        aria-label="Gráfico da elevação ao longo do percurso, com o pace alvo de cada km em degraus"
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
        const [xKm] = chart.convertFromPixel({ gridIndex: 0 }, point) as number[];
        const km = Math.min(Math.floor(xKm) + 1, splits.length);
        if (km >= 1) this.store.toggleKm(km);
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
      const selectedKm = this.store.selectedKm();
      this.theme.theme(); // re-read the tokens when the theme changes
      if (!this.ready() || !this.chart || !profile || !estimate) return;

      const colors = readThemeColors(this.host().nativeElement);
      this.chart.setOption(buildOption(profile.points, estimate, selectedKm, colors), {
        notMerge: true,
      });
    });
  }
}

function buildOption(
  points: ProfilePoint[],
  estimate: Estimate,
  selectedKm: number | null,
  c: ThemeColors,
): EChartsCoreOption {
  const splits = estimate.splits;
  const totalKm = (points[points.length - 1]?.distanceM ?? 0) / 1000;
  const elevation = points.map((p) => [p.distanceM / 1000, p.elevationM]);

  // Step line: each split holds its pace from its start to the next start.
  const paceSteps = splits.map((s) => [s.km - 1, s.paceSPerKm]);
  paceSteps.push([totalKm, splits[splits.length - 1].paceSPerKm]);
  const paces = splits.map((s) => s.paceSPerKm);
  const paceMin = Math.floor((Math.min(...paces) - 10) / 5) * 5;
  const paceMax = Math.ceil((Math.max(...paces) + 10) / 5) * 5;

  const axisLabel = { color: c.inkSubtle, fontFamily: MONO, fontSize: 11 };
  const axisName = {
    color: c.inkSubtle,
    fontFamily: SANS,
    fontSize: 11,
    fontWeight: 600,
  };
  const selected = selectedKm ? splits[selectedKm - 1] : undefined;

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
        const xKm = params[0]?.axisValue ?? 0;
        const elevationM = params.find((p) => p.seriesIndex === 0)?.value[1];
        const split = splits[Math.min(Math.floor(xKm), splits.length - 1)];
        return [
          `km ${formatNumber(xKm, 2)}`,
          elevationM === undefined ? '' : `${formatNumber(elevationM)} m`,
          `${formatPace(split.paceSPerKm)} /km`,
        ]
          .filter(Boolean)
          .join('<br>');
      },
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: totalKm,
      interval: totalKm > 25 ? 5 : totalKm > 12 ? 2 : 1,
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
      {
        type: 'value',
        name: $localize`PACE (MIN/KM)`,
        // The axis is inverted (faster on top), so its start is the top.
        nameLocation: 'start',
        nameTextStyle: { ...axisName, align: 'right' },
        inverse: true,
        min: paceMin,
        max: paceMax,
        axisLabel: { ...axisLabel, formatter: (v: number) => formatPace(v) },
        splitLine: { show: false },
      },
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
      {
        type: 'line',
        data: paceSteps,
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
                  { xAxis: selected.km - 1 },
                  { xAxis: selected.km - 1 + selected.distanceM / 1000 },
                ],
              ],
            }
          : undefined,
      },
    ],
  };
}
