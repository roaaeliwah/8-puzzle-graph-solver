import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { SolveRequest, SolveResponse } from '../models/puzzle.models';

@Injectable({ providedIn: 'root' })
export class PuzzleApiService {
  private readonly apiUrl = 'http://localhost:5000';
  private readonly fallbackUrl = 'http://localhost:8000';

  constructor(private readonly http: HttpClient) {}

  solve(request: SolveRequest): Observable<SolveResponse> {
    return this.http.post<SolveResponse>(`${this.apiUrl}/solve`, request).pipe(
      catchError(() => this.http.post<SolveResponse>(`${this.fallbackUrl}/solve`, request)),
      timeout(60_000)
    );
  }
}
