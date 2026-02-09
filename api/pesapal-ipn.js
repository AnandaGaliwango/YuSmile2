// api/pesapal-ipn.js
const fetch = require('node-fetch');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Log the IPN request
    console.log('IPN received:', {
      body: req.body,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });

    const { OrderTrackingId, OrderNotificationType, OrderMerchantReference } = req.body;

    if (OrderNotificationType === 'CHANGE' && OrderTrackingId) {
      // Get transaction status from Pesapal
      const transactionStatus = await getTransactionStatus(OrderTrackingId);
      
      if (transactionStatus) {
        await updateDonationStatus(OrderTrackingId, transactionStatus);
        
        // Send email notification if completed
        if (transactionStatus.status === 'COMPLETED') {
          await sendDonationConfirmation(OrderTrackingId, transactionStatus);
        }
      }
    }

    // Always return success to Pesapal
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('IPN processing error:', error);
    res.status(200).json({ status: 'success' }); // Still return success to Pesapal
  }
}

async function getTransactionStatus(orderTrackingId) {
  const {
    PESAPAL_CONSUMER_KEY,
    PESAPAL_CONSUMER_SECRET,
    PESAPAL_ENVIRONMENT = 'demo'
  } = process.env;

  const PESAPAL_API = PESAPAL_ENVIRONMENT === 'demo' 
    ? 'https://cybqa.pesapal.com/pesapalv3'
    : 'https://pay.pesapal.com/v3';

  const token = await getAccessToken(PESAPAL_API, PESAPAL_CONSUMER_KEY, PESAPAL_CONSUMER_SECRET);
  
  if (!token) return null;

  const response = await fetch(
    `${PESAPAL_API}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    }
  );

  if (response.ok) {
    return await response.json();
  }
  
  return null;
}

async function getAccessToken(apiUrl, consumerKey, consumerSecret) {
  const response = await fetch(`${apiUrl}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      consumer_key: consumerKey,
      consumer_secret: consumerSecret
    })
  });
  
  if (response.ok) {
    const data = await response.json();
    return data.token;
  }
  
  return null;
}

async function updateDonationStatus(orderId, transactionData) {
  // Update your database here
  console.log('Updating donation status:', {
    orderId,
    status: transactionData.status,
    paymentMethod: transactionData.payment_method,
    updatedAt: new Date().toISOString()
  });
  
  // Example for database update:
  /*
  const { db } = await import('@vercel/postgres');
  await db.sql`
    UPDATE donations 
    SET status = ${transactionData.status}, 
        payment_method = ${transactionData.payment_method},
        updated_at = NOW()
    WHERE order_id = ${orderId}
  `;
  */
}

async function sendDonationConfirmation(orderId, transactionData) {
  // Send confirmation email
  console.log('Would send confirmation email for:', {
    orderId,
    amount: transactionData.amount,
    currency: transactionData.currency
  });
  
  // Example using SendGrid, Resend, or other email service
  /*
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'YuSmile Uganda <donations@yusmileuganda.org>',
      to: [donorEmail],
      subject: 'Thank you for your donation!',
      html: `<h1>Thank you for your donation!</h1>...`
    })
  });
  */
}