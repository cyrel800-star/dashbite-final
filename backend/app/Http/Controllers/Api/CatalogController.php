<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use App\Models\Restaurant;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    /**
     * GET /api/catalog/restaurants
     * List orderable restaurants (open + not disabled).
     */
    public function restaurants(Request $request)
    {
        $restaurants = Restaurant::orderable()
            ->select(['id', 'name', 'address', 'phone', 'is_open'])
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $restaurants,
            'meta' => ['count' => $restaurants->count()],
        ]);
    }

    /**
     * GET /api/catalog/restaurants/{id}
     * Restaurant detail. Only orderable restaurants are accessible.
     */
    public function showRestaurant(int $id)
    {
        $restaurant = Restaurant::orderable()->find($id);

        if (! $restaurant) {
            return response()->json([
                'error'   => 'restaurant_not_orderable',
                'message' => 'Restaurant is not available for ordering.',
            ], 404);
        }

        return response()->json([
            'data' => [
                'id'       => $restaurant->id,
                'name'     => $restaurant->name,
                'address'  => $restaurant->address,
                'phone'    => $restaurant->phone,
                'is_open'  => $restaurant->is_open,
            ],
        ]);
    }

    /**
     * GET /api/catalog/restaurants/{id}/menu
     * Menu items for an orderable restaurant.
     * Excludes unavailable items by default, but allows include_unavailable=1 for inventory visibility.
     */
    public function menu(Request $request, int $id)
    {
        $restaurant = Restaurant::orderable()->find($id);

        if (! $restaurant) {
            return response()->json([
                'error'   => 'restaurant_not_orderable',
                'message' => 'Restaurant is not available for ordering.',
            ], 404);
        }

        $query = $restaurant->menuItems();

        if (! $request->boolean('include_unavailable')) {
            $query->available();
        }

        $items = $query
            ->select(['id', 'name', 'description', 'price', 'is_available'])
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $items,
            'meta' => [
                'restaurant_id'   => $restaurant->id,
                'restaurant_name' => $restaurant->name,
                'count'           => $items->count(),
            ],
        ]);
    }
}