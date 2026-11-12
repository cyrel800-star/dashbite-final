<?php

namespace App\Http\Controllers\Api;

use App\Enums\AccountStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::query()->select(['id', 'name', 'email', 'phone', 'role', 'account_status', 'restaurant_id', 'created_at']);

        if ($role = $request->query('role')) {
            $query->where('role', strtolower($role));
        }

        if ($status = $request->query('status')) {
            $normalized = strtolower($status);
            if ($normalized === 'pending_approval' || $normalized === 'pending') {
                $query->whereIn('account_status', ['pending', 'pending_approval']);
            } else {
                $query->where('account_status', $normalized);
            }
        }

        $users = $query->orderByDesc('id')->get()->map(function ($u) {
            return [
                'id'             => $u->id,
                'name'           => $u->name,
                'email'          => $u->email,
                'phone'          => $u->phone,
                'role'           => strtoupper($u->role->value),
                'status'         => $u->account_status->toContract(),
                'account_status' => $u->account_status->toContract(),
                'restaurant_id'  => $u->restaurant_id,
                'created_at'     => $u->created_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'message' => 'Users retrieved.',
            'data'    => $users,
        ]);
    }

    public function approve(int $id)
    {
        $user = User::find($id);
        if (! $user) {
            return response()->json(['error' => 'user_not_found'], 404);
        }

        $user->update(['account_status' => AccountStatus::Approved]);

        return response()->json([
            'message' => 'Account approved.',
            'data'    => [
                'id'             => $user->id,
                'account_status' => $user->account_status->value,
                'status'         => $user->account_status->toContract(),
            ],
        ]);
    }

    public function toggleStatus(int $id)
    {
        $user = User::find($id);
        if (! $user) {
            return response()->json(['error' => 'user_not_found'], 404);
        }

        $newStatus = $user->account_status === AccountStatus::Approved ? AccountStatus::Disabled : AccountStatus::Approved;
        $user->update(['account_status' => $newStatus]);

        return response()->json([
            'message' => "Account status changed to {$newStatus->value}.",
            'data'    => ['id' => $user->id, 'account_status' => $newStatus->toContract()],
        ]);
    }
}