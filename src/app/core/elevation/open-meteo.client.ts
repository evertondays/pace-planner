import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

const ENDPOINT = 'https://api.open-meteo.com/v1/elevation';
const MAX_COORDINATES_PER_REQUEST = 100;

interface ElevationResponse {
  elevation: number[];
}

/**
 * Open-Meteo Elevation API (Copernicus DEM GLO-90, 90 m). Free for
 * non-commercial use with attribution; up to 100 coordinates per request.
 */
@Injectable({ providedIn: 'root' })
export class OpenMeteoClient {
  private readonly http = inject(HttpClient);

  async fetchElevationsM(points: { lat: number; lon: number }[]): Promise<number[]> {
    const batches: { lat: number; lon: number }[][] = [];
    for (let i = 0; i < points.length; i += MAX_COORDINATES_PER_REQUEST) {
      batches.push(points.slice(i, i + MAX_COORDINATES_PER_REQUEST));
    }

    const results = await Promise.all(batches.map((batch) => this.fetchBatch(batch)));
    return results.flat();
  }

  private async fetchBatch(points: { lat: number; lon: number }[]): Promise<number[]> {
    const params = {
      latitude: points.map((p) => p.lat.toFixed(5)).join(','),
      longitude: points.map((p) => p.lon.toFixed(5)).join(','),
    };
    const response = await firstValueFrom(this.http.get<ElevationResponse>(ENDPOINT, { params }));
    if (response.elevation?.length !== points.length) {
      throw new Error(
        `Open-Meteo returned ${response.elevation?.length ?? 0} elevations for ${points.length} points`,
      );
    }
    return response.elevation;
  }
}
