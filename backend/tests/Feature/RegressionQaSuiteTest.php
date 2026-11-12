<?php

namespace Tests\Feature;

use App\Enums\AccountStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\UserRole;
use App\Models\Complaint;
use App\Models\DispatchAttempt;
use App\Models\DispatchOffer;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\PaymentRecord;
use App\Models\Rating;
use App\Models\Restaurant;
use App\Models\RiderProfile;
use App\Models\Setting;
use App\Models\User;
use App\Services\DispatchService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RegressionQaSuiteTest extends TestCase
{
    use RefreshDatabase;

    /**
     * TC-AUTH-001: Multi-role authentication, approval gates, and OTP throttling.
     */
    public function test_tc_auth_001_multi_role_login_approval_gates_and_otp_throttling(): void
    {
        // 1. Approved customer login succeeds
        $customer = User::factory()->create([
            'email'          => 'customer.qa@test.com',
            'password'       => Hash::make('password123'),
            'role'           => UserRole::Customer,
            'account_status' => AccountStatus::Approved,
        ]);

        $resCustomer = $this->postJson('/api/auth/login', [
            'email'    => 'customer.qa@test.com',
            'password' => 'password123',
            'role'     => 'customer',
        ]);
        $resCustomer->assertStatus(200);
        $this->assertEquals('APPROVED', $resCustomer->json('status'));
        $this->assertEquals('CUSTOMER', $resCustomer->json('role'));

        // 2. Pending rider: login returns status PENDING_APPROVAL and operational actions are blocked with 403
        $pendingRider = User::factory()->create([
            'email'          => 'rider.pending.qa@test.com',
            'password'       => Hash::make('password123'),
            'role'           => UserRole::Rider,
            'account_status' => AccountStatus::Pending,
        ]);
        $resPending = $this->postJson('/api/auth/login', [
            'email'    => 'rider.pending.qa@test.com',
            'password' => 'password123',
            'role'     => 'rider',
        ]);
        $resPending->assertStatus(200);
        $this->assertEquals('PENDING_APPROVAL', $resPending->json('status'));

        // Attempt operational action while pending -> 403
        Sanctum::actingAs($pendingRider);
        $resPendingAction = $this->postJson('/api/rider/availability', [
            'is_online'    => true,
            'is_available' => true,
        ]);
        $resPendingAction->assertStatus(403);
        $this->assertEquals('account_pending', $resPendingAction->json('error'));

        // 3. Disabled restaurant blocked completely at login with 403 ACCOUNT_DISABLED
        $disabledRest = User::factory()->create([
            'email'          => 'restaurant.disabled.qa@test.com',
            'password'       => Hash::make('password123'),
            'role'           => UserRole::Restaurant,
            'account_status' => AccountStatus::Disabled,
        ]);
        $resDisabled = $this->postJson('/api/auth/login', [
            'email'    => 'restaurant.disabled.qa@test.com',
            'password' => 'password123',
            'role'     => 'restaurant',
        ]);
        $resDisabled->assertStatus(403);
        $this->assertEquals('ACCOUNT_DISABLED', $resDisabled->json('error'));

        // 4. OTP Request throttling: 5 allowed per minute, 6th returns 429 OTP_THROTTLED
        for ($i = 1; $i <= 5; $i++) {
            $otpRes = $this->postJson('/api/auth/otp/request', [
                'email' => 'qa-otp@test.com',
            ]);
            $otpRes->assertStatus(200);
        }
        $throttledRes = $this->postJson('/api/auth/otp/request', [
            'email' => 'qa-otp@test.com',
        ]);
        $throttledRes->assertStatus(429);
        $this->assertEquals('OTP_THROTTLED', $throttledRes->json('error'));
    }

    /**
     * TC-ORD-001: Customer order placement, out-of-stock, and out-of-boundary.
     */
    public function test_tc_ord_001_customer_order_placement_stock_and_boundary_checks(): void
    {
        Setting::set('delivery_fee', 30.00);

        $customer = User::factory()->create([
            'role'           => UserRole::Customer,
            'account_status' => AccountStatus::Approved,
        ]);
        $restaurant = Restaurant::factory()->create([
            'is_open'          => true,
            'is_disabled'      => false,
            'service_boundary' => [
                'lat_min' => 14.50, 'lat_max' => 14.70,
                'lng_min' => 120.90, 'lng_max' => 121.10,
            ],
        ]);
        $restUser = User::factory()->create([
            'role'           => UserRole::Restaurant,
            'account_status' => AccountStatus::Approved,
            'restaurant_id'  => $restaurant->id,
        ]);

        $availableItem = MenuItem::create([
            'restaurant_id' => $restaurant->id,
            'name'          => 'Pork Sisig',
            'price'         => 150.00,
            'is_available'  => true,
        ]);
        $outOfStockItem = MenuItem::create([
            'restaurant_id' => $restaurant->id,
            'name'          => 'Lechon Kawali',
            'price'         => 220.00,
            'is_available'  => false,
        ]);

        Sanctum::actingAs($customer);

        // 1. Order with out-of-stock item -> 400 OUT_OF_STOCK
        $resStock = $this->postJson('/api/orders', [
            'idempotency_key'  => 'test-stock-' . uniqid(),
            'restaurant_id'    => $restaurant->id,
            'delivery_address' => 'Plaza Rizal, Poblacion',
            'delivery_lat'     => 14.5995,
            'delivery_lng'     => 120.9842,
            'payment_method'   => 'cod',
            'items'            => [
                ['menu_item_id' => $outOfStockItem->id, 'quantity' => 1],
            ],
        ]);
        $resStock->assertStatus(400);
        $this->assertEquals('OUT_OF_STOCK', $resStock->json('error'));

        // 2. Order with out-of-boundary coordinates -> 400 OUT_OF_BOUNDARY
        $resBoundary = $this->postJson('/api/orders', [
            'idempotency_key'  => 'test-boundary-' . uniqid(),
            'restaurant_id'    => $restaurant->id,
            'delivery_address' => 'Faraway Mountain, Outside Town',
            'delivery_lat'     => 15.2000, // outside polygon
            'delivery_lng'     => 121.5000,
            'payment_method'   => 'cod',
            'items'            => [
                ['menu_item_id' => $availableItem->id, 'quantity' => 2],
            ],
        ]);
        $resBoundary->assertStatus(400);
        $this->assertEquals('OUT_OF_BOUNDARY', $resBoundary->json('error'));

        // 3. Valid order placement -> 201 Created with exact subtotal and delivery fee
        $idempKey = 'order-valid-' . uniqid();
        $resValid = $this->postJson('/api/orders', [
            'idempotency_key'  => $idempKey,
            'restaurant_id'    => $restaurant->id,
            'delivery_address' => '123 Poblacion St',
            'delivery_lat'     => 14.5995,
            'delivery_lng'     => 120.9842,
            'payment_method'   => 'cod',
            'items'            => [
                ['menu_item_id' => $availableItem->id, 'quantity' => 2],
            ],
        ]);
        $resValid->assertStatus(201);
        $this->assertEquals(300.00, (float)$resValid->json('data.subtotal'));
        $this->assertEquals(30.00, (float)$resValid->json('data.delivery_fee'));
        $this->assertEquals(330.00, (float)$resValid->json('data.total'));
        $this->assertEquals('PENDING', $resValid->json('status'));

        // 4. Duplicate submission idempotent behavior
        $resDuplicate = $this->postJson('/api/orders', [
            'idempotency_key'  => $idempKey,
            'restaurant_id'    => $restaurant->id,
            'delivery_address' => '123 Poblacion St',
            'delivery_lat'     => 14.5995,
            'delivery_lng'     => 120.9842,
            'payment_method'   => 'cod',
            'items'            => [
                ['menu_item_id' => $availableItem->id, 'quantity' => 2],
            ],
        ]);
        $resDuplicate->assertStatus(201);
        $this->assertEquals($resValid->json('order_id'), $resDuplicate->json('order_id'));
        $this->assertEquals(1, Order::where('idempotency_key', $idempKey)->count());
    }

    /**
     * TC-REST-001: Restaurant accept and reject decisions.
     */
    public function test_tc_rest_001_restaurant_accept_reject_and_lifecycle(): void
    {
        $restaurant = Restaurant::factory()->create([
            'is_open'     => true,
            'is_disabled' => false,
        ]);
        $restUser = User::factory()->create([
            'role'           => UserRole::Restaurant,
            'account_status' => AccountStatus::Approved,
            'restaurant_id'  => $restaurant->id,
        ]);
        $customer = User::factory()->create([
            'role'           => UserRole::Customer,
            'account_status' => AccountStatus::Approved,
        ]);

        $order1 = Order::create([
            'idempotency_key'  => 'order-rest-1-' . uniqid(),
            'customer_id'      => $customer->id,
            'restaurant_id'    => $restaurant->id,
            'status'           => OrderStatus::Pending,
            'payment_method'   => 'cod',
            'subtotal'         => 200,
            'delivery_fee'     => 30,
            'total'            => 230,
            'delivery_address' => 'Customer House',
            'placed_at'        => now(),
        ]);

        $order2 = Order::create([
            'idempotency_key'  => 'order-rest-2-' . uniqid(),
            'customer_id'      => $customer->id,
            'restaurant_id'    => $restaurant->id,
            'status'           => OrderStatus::Pending,
            'payment_method'   => 'cod',
            'subtotal'         => 150,
            'delivery_fee'     => 30,
            'total'            => 180,
            'delivery_address' => 'Customer Office',
            'placed_at'        => now(),
        ]);

        Sanctum::actingAs($restUser);

        // 1. Restaurant rejects Order 1 -> status is REJECTED, no dispatch attempt created
        $resReject = $this->postJson("/api/restaurant/orders/{$order1->id}/reject", [
            'reason' => 'Kitchen closing early',
        ]);
        $resReject->assertStatus(200);
        $this->assertEquals('rejected', $resReject->json('data.status'));
        $this->assertEquals(0, DispatchAttempt::where('order_id', $order1->id)->count());

        // 2. Restaurant accepts Order 2 -> status is ACCEPTED with prep time
        $resAccept = $this->postJson("/api/restaurant/orders/{$order2->id}/accept", [
            'prep_minutes' => 25,
        ]);
        $resAccept->assertStatus(200);
        $this->assertEquals('accepted', $resAccept->json('data.status'));

        // 3. Mark PREPARING
        $resPrep = $this->patchJson("/api/restaurant/orders/{$order2->id}/preparing");
        $resPrep->assertStatus(200);
        $this->assertEquals('preparing', $resPrep->json('data.status'));

        // 4. Mark READY -> triggers dispatch blast, status moves to SEARCHING_RIDER
        $resReady = $this->patchJson("/api/restaurant/orders/{$order2->id}/ready");
        $resReady->assertStatus(200);
        $this->assertEquals('searching_rider', $resReady->json('data.status'));
        $this->assertEquals(1, DispatchAttempt::where('order_id', $order2->id)->count());
    }

    /**
     * TC-DISP-001: Simultaneous 1 km ring dispatch blast, ring expansion, and service boundary stop.
     */
    public function test_tc_disp_001_simultaneous_ring_blast_expansion_and_boundary_stop(): void
    {
        $restaurant = Restaurant::factory()->create([
            'service_boundary' => ['lat_center' => 14.5995, 'lng_center' => 120.9842],
        ]);
        $customer = User::factory()->create(['role' => UserRole::Customer, 'account_status' => AccountStatus::Approved]);

        // Rider inside 1km ring (~500m away)
        $riderClose = User::factory()->create(['role' => UserRole::Rider, 'account_status' => AccountStatus::Approved]);
        RiderProfile::create([
            'user_id'          => $riderClose->id,
            'is_online'        => true,
            'is_available'     => true,
            'current_lat'      => 14.6040,
            'current_lng'      => 120.9842,
            'last_location_at' => now(),
        ]);

        // Rider outside 1km ring (~1.8km away)
        $riderFar = User::factory()->create(['role' => UserRole::Rider, 'account_status' => AccountStatus::Approved]);
        RiderProfile::create([
            'user_id'          => $riderFar->id,
            'is_online'        => true,
            'is_available'     => true,
            'current_lat'      => 14.6150,
            'current_lng'      => 120.9842,
            'last_location_at' => now(),
        ]);

        $order = Order::create([
            'idempotency_key'  => 'order-disp-1-' . uniqid(),
            'customer_id'      => $customer->id,
            'restaurant_id'    => $restaurant->id,
            'status'           => OrderStatus::Ready,
            'payment_method'   => 'cod',
            'subtotal'         => 120,
            'delivery_fee'     => 30,
            'total'            => 150,
            'delivery_address' => 'Market Road',
            'placed_at'        => now(),
        ]);

        $service = new DispatchService();

        // 1. Initial 1km blast
        $attempt1 = $service->start($order);
        $this->assertEquals(1, $attempt1->ring_km);
        $this->assertEquals('broadcasting', $attempt1->status);

        // Only riderClose received the offer; riderFar did not
        $this->assertDatabaseHas('dispatch_offers', [
            'dispatch_attempt_id' => $attempt1->id,
            'rider_id'            => $riderClose->id,
            'status'              => 'pending',
        ]);
        $this->assertDatabaseMissing('dispatch_offers', [
            'dispatch_attempt_id' => $attempt1->id,
            'rider_id'            => $riderFar->id,
        ]);

        // 2. Expand ring after timeout via API endpoint
        Sanctum::actingAs($riderClose);
        $resExp = $this->postJson("/api/dispatch/orders/{$order->id}/timeout")->assertOk();
        $this->assertEquals(2, $resExp->json('ring_radius_km'));

        // Now riderFar receives offer in ring 2
        $attempt2 = DispatchAttempt::where('order_id', $order->id)->where('ring_km', 2)->first();
        $this->assertNotNull($attempt2);
        $this->assertDatabaseHas('dispatch_offers', [
            'dispatch_attempt_id' => $attempt2->id,
            'rider_id'            => $riderFar->id,
            'status'              => 'pending',
        ]);

        // 3. Max ring reached (service boundary limit 5km) -> transitions to NO_RIDER
        $this->postJson("/api/dispatch/orders/{$order->id}/timeout"); // Ring 3
        $this->postJson("/api/dispatch/orders/{$order->id}/timeout"); // Ring 4
        $this->postJson("/api/dispatch/orders/{$order->id}/timeout"); // Ring 5
        $finalTimeout = $this->postJson("/api/dispatch/orders/{$order->id}/timeout")->assertOk();

        $this->assertEquals('NO_RIDER', $finalTimeout->json('order_status'));
        $this->assertEquals(OrderStatus::NoRider, $order->fresh()->status);
    }

    /**
     * TC-DISP-002: Race-safe atomic offer acceptance by simultaneous riders.
     */
    public function test_tc_disp_002_race_safe_simultaneous_rider_acceptance(): void
    {
        $restaurant = Restaurant::factory()->create([
            'service_boundary' => ['lat_center' => 14.5995, 'lng_center' => 120.9842],
        ]);
        $customer = User::factory()->create(['role' => UserRole::Customer, 'account_status' => AccountStatus::Approved]);
        $rider1 = User::factory()->create(['role' => UserRole::Rider, 'account_status' => AccountStatus::Approved]);
        $rider2 = User::factory()->create(['role' => UserRole::Rider, 'account_status' => AccountStatus::Approved]);

        RiderProfile::create([
            'user_id'          => $rider1->id,
            'is_online'        => true,
            'is_available'     => true,
            'current_lat'      => 14.6040,
            'current_lng'      => 120.9842,
            'last_location_at' => now(),
        ]);

        RiderProfile::create([
            'user_id'          => $rider2->id,
            'is_online'        => true,
            'is_available'     => true,
            'current_lat'      => 14.5950,
            'current_lng'      => 120.9842,
            'last_location_at' => now(),
        ]);

        $order = Order::create([
            'idempotency_key'  => 'order-race-' . uniqid(),
            'customer_id'      => $customer->id,
            'restaurant_id'    => $restaurant->id,
            'status'           => OrderStatus::Ready,
            'payment_method'   => 'cod',
            'subtotal'         => 100,
            'delivery_fee'     => 30,
            'total'            => 130,
            'delivery_address' => 'Highway 1',
            'placed_at'        => now(),
        ]);

        $service = new DispatchService();
        $attempt = $service->start($order);

        // Rider 1 accepts first -> 200 ASSIGNED
        Sanctum::actingAs($rider1);
        $resRider1 = $this->postJson('/api/dispatch/accept-offer', [
            'order_id' => $order->id,
            'rider_id' => $rider1->id,
        ]);
        $resRider1->assertStatus(200);
        $this->assertEquals('ASSIGNED', $resRider1->json('status'));
        $this->assertEquals($order->id, $resRider1->json('data.order_id'));

        // Rider 2 accepts milliseconds later -> 409 OFFER_ALREADY_CLAIMED
        Sanctum::actingAs($rider2);
        $resRider2 = $this->postJson('/api/dispatch/accept-offer', [
            'order_id' => $order->id,
            'rider_id' => $rider2->id,
        ]);
        $resRider2->assertStatus(409);
        $this->assertEquals('OFFER_ALREADY_CLAIMED', $resRider2->json('error'));

        // Verify in DB that only rider 1 is assigned
        $order->refresh();
        $this->assertEquals($rider1->id, $order->rider_id);
    }

    /**
     * TC-DELIV-001: Strict delivery lifecycle transitions and invalid transition blocking.
     */
    public function test_tc_deliv_001_delivery_lifecycle_and_illegal_transition_rejection(): void
    {
        $rider = User::factory()->create(['role' => UserRole::Rider, 'account_status' => AccountStatus::Approved]);
        $customer = User::factory()->create(['role' => UserRole::Customer, 'account_status' => AccountStatus::Approved]);
        $restaurant = Restaurant::factory()->create();

        $order = Order::create([
            'idempotency_key'  => 'order-deliv-' . uniqid(),
            'customer_id'      => $customer->id,
            'restaurant_id'    => $restaurant->id,
            'rider_id'         => $rider->id,
            'status'           => OrderStatus::Ready, // Assigned, but food not picked up yet
            'payment_method'   => 'cod',
            'subtotal'         => 180,
            'delivery_fee'     => 30,
            'total'            => 210,
            'delivery_address' => '456 Mango St',
            'placed_at'        => now(),
        ]);

        Sanctum::actingAs($rider);

        // 1. Attempt DELIVERED directly before PICKED_UP -> 422 INVALID_TRANSITION
        $resPremature = $this->patchJson("/api/rider/orders/{$order->id}/delivered", [
            'cash_collected' => 210.00,
        ]);
        $resPremature->assertStatus(422);
        $this->assertEquals('INVALID_TRANSITION', $resPremature->json('error'));

        // 2. Mark PICKED_UP -> 200 PICKED_UP
        $resPickup = $this->patchJson("/api/rider/orders/{$order->id}/pickup");
        $resPickup->assertStatus(200);
        $this->assertEquals('PICKED_UP', $resPickup->json('status'));

        // 3. Mark DELIVERED with valid COD cash -> 200 DELIVERED
        $resDelivered = $this->patchJson("/api/rider/orders/{$order->id}/delivered", [
            'cash_collected' => 210.00,
        ]);
        $resDelivered->assertStatus(200);
        $this->assertEquals('DELIVERED', $resDelivered->json('status'));

        $order->refresh();
        $this->assertEquals(OrderStatus::Delivered, $order->status);
        $this->assertNotNull($order->delivered_at);
        $this->assertEquals(210.00, (float)$order->cash_collected);
    }

    /**
     * TC-PAY-001: Strict COD reconciliation, mismatch flagging, and Admin discrepancy resolution.
     */
    public function test_tc_pay_001_cod_discrepancy_flagging_and_admin_resolution(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin, 'account_status' => AccountStatus::Approved]);
        $rider = User::factory()->create(['role' => UserRole::Rider, 'account_status' => AccountStatus::Approved]);
        $customer = User::factory()->create(['role' => UserRole::Customer, 'account_status' => AccountStatus::Approved]);
        $restaurant = Restaurant::factory()->create();

        $order = Order::create([
            'idempotency_key'  => 'order-pay-' . uniqid(),
            'customer_id'      => $customer->id,
            'restaurant_id'    => $restaurant->id,
            'rider_id'         => $rider->id,
            'status'           => OrderStatus::PickedUp,
            'payment_method'   => 'cod',
            'subtotal'         => 250.00,
            'delivery_fee'     => 30.00,
            'total'            => 280.00,
            'delivery_address' => '789 Sampaguita St',
            'placed_at'        => now(),
        ]);

        // Rider collects short cash (₱250 instead of ₱280)
        Sanctum::actingAs($rider);
        $resDeliv = $this->patchJson("/api/rider/orders/{$order->id}/delivered", [
            'cash_collected' => 250.00,
        ]);
        $resDeliv->assertStatus(200);

        // Verify order saved cash_collected
        $order->refresh();
        $this->assertEquals(250.00, (float)$order->cash_collected);

        // Payment record created with status FLAGGED_DISCREPANCY
        $payment = PaymentRecord::where('order_id', $order->id)->first();
        $this->assertNotNull($payment);
        $this->assertEquals(PaymentStatus::FlaggedDiscrepancy, $payment->status);

        // Admin logs in and checks discrepancy queue
        Sanctum::actingAs($admin);
        $resQueue = $this->getJson('/api/admin/payments/discrepancies');
        $resQueue->assertStatus(200);
        $this->assertTrue(collect($resQueue->json('data'))->contains('id', $payment->id));

        // Admin resolves discrepancy
        $resResolve = $this->postJson("/api/admin/payments/{$payment->id}/resolve-discrepancy", [
            'notes' => 'Customer short ₱30 waived per team lead authorization.',
        ]);
        $resResolve->assertStatus(200);
        $this->assertEquals('REMITTED_TO_ADMIN', $resResolve->json('payment_status'));
    }

    /**
     * TC-SEC-001: Role permission boundaries and unauthorized action blocking.
     */
    public function test_tc_sec_001_role_permission_boundaries_and_403_enforcement(): void
    {
        $customer = User::factory()->create(['role' => UserRole::Customer, 'account_status' => AccountStatus::Approved]);
        $rider = User::factory()->create(['role' => UserRole::Rider, 'account_status' => AccountStatus::Approved]);
        $pendingUser = User::factory()->create(['role' => UserRole::Rider, 'account_status' => AccountStatus::Pending]);

        // 1. Customer cannot access Admin endpoints (403 Forbidden)
        Sanctum::actingAs($customer);

        $resApprove = $this->postJson("/api/admin/users/{$pendingUser->id}/approve");
        $resApprove->assertStatus(403);

        $resFee = $this->patchJson('/api/admin/settings/fee', ['delivery_fee' => 50]);
        $resFee->assertStatus(403);

        $resBoundary = $this->patchJson('/api/admin/settings/boundary', [
            'boundary_polygon' => [
                ['lat' => 14.59, 'lng' => 120.98],
                ['lat' => 14.61, 'lng' => 120.98],
                ['lat' => 14.60, 'lng' => 121.00],
            ],
        ]);
        $resBoundary->assertStatus(403);

        // 2. Customer cannot access Restaurant orders
        $resRestOrders = $this->getJson('/api/restaurant/orders');
        $resRestOrders->assertStatus(403);

        // 3. Rider cannot access Admin settings
        Sanctum::actingAs($rider);
        $resRiderFee = $this->patchJson('/api/admin/settings/fee', ['delivery_fee' => 50]);
        $resRiderFee->assertStatus(403);
    }

    /**
     * TC-ISO-001: Verification that customer ratings and rider attendance are isolated from dispatch.
     */
    public function test_tc_iso_001_ratings_and_attendance_isolation_from_dispatch(): void
    {
        $restaurant = Restaurant::factory()->create([
            'service_boundary' => ['lat_center' => 14.5995, 'lng_center' => 120.9842],
        ]);
        $customer = User::factory()->create(['role' => UserRole::Customer, 'account_status' => AccountStatus::Approved]);

        // Rider A: has 1-star rating and complaint, but is approved, online, within 500m, and fresh location
        $riderA = User::factory()->create(['role' => UserRole::Rider, 'account_status' => AccountStatus::Approved]);
        RiderProfile::create([
            'user_id'          => $riderA->id,
            'is_online'        => true,
            'is_available'     => true,
            'current_lat'      => 14.6010,
            'current_lng'      => 120.9842,
            'last_location_at' => now(),
        ]);

        // Past order with 1-star rating
        $pastOrder = Order::create([
            'idempotency_key'  => 'order-past-' . uniqid(),
            'customer_id'      => $customer->id,
            'restaurant_id'    => $restaurant->id,
            'rider_id'         => $riderA->id,
            'status'           => OrderStatus::Delivered,
            'payment_method'   => 'cod',
            'subtotal'         => 100,
            'delivery_fee'     => 30,
            'total'            => 130,
            'delivery_address' => 'Old Address',
            'placed_at'        => now()->subDays(2),
            'delivered_at'     => now()->subDays(2),
        ]);
        Rating::create([
            'order_id'       => $pastOrder->id,
            'customer_id'    => $customer->id,
            'rider_id'       => $riderA->id,
            'rider_rating'   => 1,
            'rider_feedback' => 'Late delivery',
        ]);
        Complaint::create([
            'order_id'    => $pastOrder->id,
            'customer_id' => $customer->id,
            'subject'     => 'Unprofessional behavior',
            'body'        => 'Late and rude',
            'status'      => 'open',
        ]);

        // Rider B: has 5-star rating, but is offline
        $riderB = User::factory()->create(['role' => UserRole::Rider, 'account_status' => AccountStatus::Approved]);
        RiderProfile::create([
            'user_id'          => $riderB->id,
            'is_online'        => false, // Offline
            'is_available'     => true,
            'current_lat'      => 14.6010,
            'current_lng'      => 120.9842,
            'last_location_at' => now(),
        ]);

        $newOrder = Order::create([
            'idempotency_key'  => 'order-new-' . uniqid(),
            'customer_id'      => $customer->id,
            'restaurant_id'    => $restaurant->id,
            'status'           => OrderStatus::Ready,
            'payment_method'   => 'cod',
            'subtotal'         => 120,
            'delivery_fee'     => 30,
            'total'            => 150,
            'delivery_address' => 'Customer Street',
            'placed_at'        => now(),
        ]);

        $service = new DispatchService();
        $attempt = $service->start($newOrder);

        // Verification: Rider A (despite 1-star rating and complaint) is offered because ratings are isolated
        $this->assertDatabaseHas('dispatch_offers', [
            'dispatch_attempt_id' => $attempt->id,
            'rider_id'            => $riderA->id,
            'status'              => 'pending',
        ]);

        // Rider B (5 stars but offline) is NOT offered
        $this->assertDatabaseMissing('dispatch_offers', [
            'dispatch_attempt_id' => $attempt->id,
            'rider_id'            => $riderB->id,
        ]);
    }
}
