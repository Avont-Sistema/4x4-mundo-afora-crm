import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, clientEmail, clientName, expeditionName, totalPrice, quantity } = body;

    if (!bookingId || !clientEmail || !totalPrice) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: expeditionName || 'Expedição 4x4 Mundo Afora',
              description: `${quantity} pessoa(s)`,
            },
            unit_amount: Math.round(totalPrice * 100), // Stripe usa centavos
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL}/dashboard/bookings?success=true&bookingId=${bookingId}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/bookings?canceled=true`,
      customer_email: clientEmail,
      client_reference_id: bookingId,
      metadata: {
        bookingId,
        clientName,
        expeditionName,
      },
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error('Stripe error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment creation failed' },
      { status: 500 }
    );
  }
}
