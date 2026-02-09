// api/process-donation.js
const axios = require('axios');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, name, email, phone } = req.body;

    // Your Pesapal credentials from dashboard
    const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
    const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;
    
    // Use DEMO environment for testing, PROD for live
    const baseUrl = 'https://pay.pesapal.com/v3'; // LIVE URL
    // const baseUrl = 'https://cybqa.pesapal.com/pesapalv3'; // DEMO URL

    console.log('Processing Pesapal donation:', { amount, name, email });

    // 1. Get Access Token
    const authResponse = await axios.post(`${baseUrl}/api/Auth/RequestToken`, {
      consumer_key: consumerKey,
      consumer_secret: consumerSecret
    });

    const accessToken = authResponse.data.token;

    // 2. Create Order
    const orderData = {
      id: `YUSMILE-${Date.now()}`,
      currency: "UGX",
      amount: amount,
      description: "Donation to YuSmile Uganda",
      callback_url: `${req.headers.origin}/donation-success.html`,
      cancellation_url: `${req.headers.origin}/donation-cancelled.html`, 
      notification_id: process.env.PESAPAL_IPN_ID,
      billing_address: {
        email_address: email,
        phone_number: phone,
        first_name: name.split(' ')[0] || name,
        last_name: name.split(' ').slice(1).join(' ') || '',
        country_code: "UG"
      }
    };

    const orderResponse = await axios.post(
      `${baseUrl}/api/Transactions/SubmitOrderRequest`,
      orderData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // 3. Return redirect URL to Pesapal
    res.status(200).json({
      success: true,
      redirect_url: orderResponse.data.redirect_url,
      order_id: orderResponse.data.order_tracking_id,
      message: 'Redirecting to Pesapal...'
    });

  } catch (error) {
    console.error('Pesapal Error:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: 'Payment processing failed',
      details: error.response?.data?.message || error.message
    });
  }
};
