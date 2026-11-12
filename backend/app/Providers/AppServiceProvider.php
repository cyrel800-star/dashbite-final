<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        RateLimiter::for('otp', function (Request $request) {
            return Limit::perMinute(5)
                ->by($request->input('email') . '|' . $request->ip())
                ->response(function (Request $request, array $headers) {
                    \App\Models\OtpRequest::create([
                        'user_id'      => optional($request->user())->id,
                        'email'        => (string) $request->input('email'),
                        'ip_address'   => $request->ip(),
                        'outcome'      => \App\Enums\OtpOutcome::Throttled,
                        'requested_at' => now(),
                    ]);

                    return response()->json([
                        'error'       => 'OTP_THROTTLED',
                        'message'     => 'Too many requests. Try again in 60 seconds.',
                        'retry_after' => (int) ($headers['Retry-After'] ?? 60),
                    ], 429, $headers);
                });
        });

        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip())
                ->response(function (Request $request, array $headers) {
                    return response()->json([
                        'error'       => 'OTP_THROTTLED',
                        'message'     => 'Too many requests. Try again in 60 seconds.',
                        'retry_after' => (int) ($headers['Retry-After'] ?? 60),
                    ], 429, $headers);
                });
        });
    }
}
