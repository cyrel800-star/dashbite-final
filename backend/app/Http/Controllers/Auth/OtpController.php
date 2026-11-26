<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\OtpRequest;
use App\Enums\OtpOutcome;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;

class OtpController extends Controller
{
    public function request(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        // Generate a random 6-digit code
        $otp = rand(100000, 999999);

        // Save it in the cache for 5 minutes (300 seconds)
        Cache::put('otp_' . $data['email'], $otp, 300);

        OtpRequest::create([
            'user_id'      => optional($request->user())->id,
            'email'        => $data['email'],
            'ip_address'   => $request->ip(),
            'outcome'      => OtpOutcome::Sent,
            'requested_at' => now(),
        ]);

        // Send the REAL email
        try {
            Mail::raw("Your DashBite login code is: {$otp}\n\nThis code expires in 5 minutes.", function ($message) use ($data) {
                $message->to($data['email'])
                        ->subject('Your DashBite Login Code');
            });
        } catch (\Exception $e) {
            return response()->json(['error' => 'EMAIL_FAILED', 'message' => $e->getMessage()], 500);
        }

        return response()->json([
            'message'     => 'OTP sent to your email.',
            'retry_after' => 60,
        ]);
    }

    public function verify(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
            'otp'   => ['required', 'string', 'size:6'],
        ]);

        $cachedOtp = Cache::get('otp_' . $request->email);

        if (!$cachedOtp || $request->otp !== (string) $cachedOtp) {
            return response()->json([
                'error' => 'INVALID_OTP',
                'message' => 'The verification code is incorrect or expired.',
            ], 401);
        }

        // Clear the code so it can't be used again
        Cache::forget('otp_' . $request->email);

        // Find or create the user
        $user = User::firstOrCreate(
            ['email' => $request->email],
            [
                'name' => explode('@', $request->email)[0],
                'password' => bcrypt(str()->random(16)),
                'role' => \App\Enums\UserRole::Customer,
                'account_status' => \App\Enums\AccountStatus::Approved,
            ]
        );

        $token = $user->createToken('auth')->plainTextToken;

        return response()->json([
            'token'  => $token,
            'role'   => $user->role->toContract(),
            'status' => $user->account_status->toContract(),
            'user'   => [
                'id' => $user->id, 'name' => $user->name, 'email' => $user->email,
                'role' => $user->role->toContract(), 'account_status' => $user->account_status->toContract(),
            ],
        ]);
    }
}