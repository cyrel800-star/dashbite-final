<?php

namespace App\Http\Controllers\Auth;

use App\Enums\AccountStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class LoginController extends Controller
{
    /**
     * Endpoint 1: User Login
     * POST /api/auth/login
     */
    public function login(Request $request)
    {
        $email = $request->input('email');
        $password = $request->input('password');

        if (! $email || ! $password) {
            return response()->json([
                'error'   => 'INVALID_CREDENTIALS',
                'message' => 'Login failed.',
            ], 401);
        }

        $user = User::where('email', $email)->first();

        // Generic error, prevent account enumeration
        if (! $user || ! Hash::check($password, $user->password)) {
            return response()->json([
                'error'   => 'INVALID_CREDENTIALS',
                'message' => 'Login failed.',
            ], 401);
        }

        // Flowchart W1.03: Account status check
        // Disabled: Sign-in is blocked completely.
        if ($user->account_status === AccountStatus::Disabled) {
            return response()->json([
                'error'          => 'ACCOUNT_DISABLED',
                'message'        => 'This account has been disabled.',
                'account_status' => 'DISABLED',
            ], 403);
        }

        // Issue token for approved and pending_approval accounts (pending is routed to waiting state)
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

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'id'             => $user->id,
            'name'           => $user->name,
            'email'          => $user->email,
            'role'           => $user->role->toContract(),
            'account_status' => $user->account_status->toContract(),
            'restaurant_id'  => $user->restaurant_id,
        ]);
    }
}
