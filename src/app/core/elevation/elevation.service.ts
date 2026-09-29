import { inject, Injectable } from '@angular/core';
import { RouteGrid } from '../route/types';
import { ElevationSamples, samplePoints } from './elevation-samples';
import { OpenMeteoClient } from './open-meteo.client';

@Injectable({ providedIn: 'root' })
export class ElevationService {
  private readonly openMeteo = inject(OpenMeteoClient);

  /** Queries the API every 50 m along the route (a half marathon takes ~5 requests). */
  async fetchSamples(grid: RouteGrid): Promise<ElevationSamples> {
    const points = samplePoints(grid);
    const elevationsM = await this.openMeteo.fetchElevationsM(points);
    return { measuredDistancesM: points.map((p) => p.measuredDistanceM), elevationsM };
  }
}
