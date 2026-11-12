<?php

namespace Database\Seeders;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\Restaurant;
use App\Models\RiderProfile;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $mainRestaurant = Restaurant::first();

        $users = [
            [
                'name' => 'Customer Test',
                'email' => 'customer@test.com',
                'role' => UserRole::Customer,
                'status' => AccountStatus::Approved,
                'restaurant_id' => null,
            ],
            [
                'name' => 'Restaurant Test',
                'email' => 'restaurant@test.com',
                'role' => UserRole::Restaurant,
                'status' => AccountStatus::Approved,
                'restaurant_id' => $mainRestaurant?->id,
            ],
            [
                'name' => 'Rider 1 Test',
                'email' => 'rider@test.com',
                'role' => UserRole::Rider,
                'status' => AccountStatus::Approved,
                'restaurant_id' => null,
            ],
            [
                'name' => 'Rider 2 Test',
                'email' => 'rider2@test.com',
                'role' => UserRole::Rider,
                'status' => AccountStatus::Approved,
                'restaurant_id' => null,
            ],
            [
                'name' => 'Rider Pending',
                'email' => 'rider.pending@test.com',
                'role' => UserRole::Rider,
                'status' => AccountStatus::Pending,
                'restaurant_id' => null,
            ],
            [
                'name' => 'Restaurant Disabled',
                'email' => 'restaurant.disabled@test.com',
                'role' => UserRole::Restaurant,
                'status' => AccountStatus::Disabled,
                'restaurant_id' => null,
            ],
            [
                'name' => 'Admin Test',
                'email' => 'admin@test.com',
                'role' => UserRole::Admin,
                'status' => AccountStatus::Approved,
                'restaurant_id' => null,
            ],
        ];

        foreach ($users as $u) {
            $user = User::updateOrCreate(
                ['email' => $u['email']],
                [
                    'name' => $u['name'],
                    'password' => 'password',
                    'role' => $u['role'],
                    'account_status' => $u['status'],
                    'restaurant_id' => $u['restaurant_id'],
                ]
            );

            // Seed active rider profiles for race test (within 1km of restaurant center)
            if ($u['email'] === 'rider@test.com') {
                RiderProfile::updateOrCreate(
                    ['user_id' => $user->id],
                    [
                        'is_online' => true,
                        'is_available' => true,
                        'current_lat' => 14.6040,
                        'current_lng' => 120.9842,
                        'last_location_at' => now(),
                    ]
                );
            } elseif ($u['email'] === 'rider2@test.com') {
                RiderProfile::updateOrCreate(
                    ['user_id' => $user->id],
                    [
                        'is_online' => true,
                        'is_available' => true,
                        'current_lat' => 14.5950,
                        'current_lng' => 120.9842,
                        'last_location_at' => now(),
                    ]
                );
            }
        }

        // Default system settings
        Setting::updateOrCreate(
            ['key' => 'delivery_fee'],
            ['value' => '30.00']
        );
        Setting::updateOrCreate(
            ['key' => 'service_boundary'],
            ['value' => json_encode([
                'lat_center' => 14.5995,
                'lng_center' => 120.9842,
                'lat_min' => 14.5500,
                'lat_max' => 14.6500,
                'lng_min' => 120.9400,
                'lng_max' => 121.0300,
                'radius_km' => 5,
            ])]
        );
    }
}
