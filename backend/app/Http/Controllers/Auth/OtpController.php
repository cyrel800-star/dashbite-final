<?php

namespace App\Http\Controllers\Auth;

use App\Enums\OtpOutcome;
use App\Enums\AccountStatus;
use App\Http\Controllers\Controller;
use App\Models\OtpRequest;
use App\Models\User;
use Illuminate\Http\Request;

class OtpController extends Controller
{
    public function request(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        OtpRequest::create([
            'user_id'      => optional($request->user())->id,
            'email'        => $data['email'],
            'ip_address'   => $request->ip(),
            'outcome'      => OtpOutcome::Sent,
            'requested_at' => now(),
        ]);

        return response()->json([
            'message'     => 'OTP sent.',
            'retry_after' => 60,
        ]);
    }

    public function verify(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
            'otp'   => ['required', 'string', 'size:6'],
        ]);

        // For this school project, the mock OTP is always 123456
        if ($request->otp !== '123456') {
            return response()->json([
                'error' => 'INVALID_OTP',
                'message' => 'The verification code is incorrect.',
            ], 401);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['error' => 'USER_NOT_FOUND', 'message' => 'No account found with this email.'], 404);
        }

        if ($user->account_status === AccountStatus::Disabled) {
            return response()->json(['error' => 'ACCOUNT_DISABLED', 'message' => 'This account has been disabled.'], 403);
        }

        $token = $user->createToken('auth')->plainTextToken;

        return response()->json([
            'token'  => $token,
            'role'   => $user->role->toContract(),
            'status' => $user->account_status->toContract(),
            'user'   => [
                'id'             => $user->id,
                'name'           => $user->name,
                'email'          => $user->email,
                'role'           => $user->role->toContract(),
                'account_status' => $user->account_status->toContract(),
                'restaurant_id'  => $user->restaurant_id,
            ],
        ], 200);
    }
}