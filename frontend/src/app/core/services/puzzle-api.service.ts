import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { SolveRequest, SolveResponse } from '../models/puzzle.models';

@Injectable({ providedIn: 'root' })
export class PuzzleApiService {
  private readonly apiUrl = 'http://localhost:8000';

  constructor(private readonly http: HttpClient) {}

  solve(request: SolveRequest): Observable<SolveResponse> {
    return this.http.post<SolveResponse>(`${this.apiUrl}/solve`, request).pipe(timeout(60_000));
  }
}
