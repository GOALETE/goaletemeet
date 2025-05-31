"use client";
import { useState, useEffect } from "react";
import Script from "next/script";

// Declare the Razorpay interface
declare global {
  interface Window {
    Razorpay: any;
  }
}

// Centralized pricing configuration
const PLAN_PRICING = {
  single: {
    amount: 499,
    display: "Rs. 499",
    duration: 1 // 1 day for single session
  },
  monthly: {
    amount: 4999,
    display: "Rs. 4999",
    duration: 30 // 30 days for monthly plan
  }
};

export default function RegistrationForm() {  
  const [plan, setPlan] = useState<"single" | "monthly">("single");
  const [startDate, setStartDate] = useState("");
  const [source, setSource] = useState("Instagram");
  const [reference, setReference] = useState("");
  const [isRazorpayLoaded, setIsRazorpayLoaded] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [duration, setDuration] = useState(PLAN_PRICING.single.duration)  
  const [showPayment, setShowPayment] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  // Set today's date as the default start date when component mounts
  useEffect(() => {
    setStartDate(new Date().toISOString().split('T')[0]);
  }, []);

  // Check for subscription conflicts when user changes plan or date
  useEffect(() => {
    // Only check if email is entered
    if (email && email.includes('@')) {
      checkSubscriptionConflict();
    }
  }, [email, plan, startDate]);

  // Helper function to check if a date is today
  const isToday = (dateString: string): boolean => {
    if (!dateString) return false;
    const today = new Date().toISOString().split('T')[0];
    return dateString === today;
  };

  // Update duration when plan changes
  const handlePlanChange = (newPlan: "single" | "monthly") => {
    setPlan(newPlan);
    setDuration(PLAN_PRICING[newPlan].duration);
  };

  // Check for existing subscription conflicts
  const checkSubscriptionConflict = async () => {
    if (!email || !email.includes('@') || !startDate) return;
    
    setIsCheckingSubscription(true);
    setErrorMessage(null);
    
    try {
      // Calculate end date based on plan duration
      const start = new Date(startDate);
      const end = new Date(startDate);
      end.setDate(end.getDate() + PLAN_PRICING[plan].duration);
      
      const response = await fetch("/api/check-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          planType: plan,
          startDate: start.toISOString(),
          endDate: end.toISOString()
        }),
      });
      
      const data = await response.json();
      
      if (!data.canSubscribe) {
        setErrorMessage(data.message);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
    } finally {
      setIsCheckingSubscription(false);
    }
  };
  // handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null); // Reset error message on new submission
    console.log("Form submitted with data:", {
      firstName,
      lastName,
      email,
      phone,
      plan,
      startDate,
      duration,
      source,
      reference,
    });    try {
      const price = PLAN_PRICING[plan].amount;
      
      // Double-check subscription availability
      const start = new Date(startDate);
      const end = new Date(startDate);
      end.setDate(end.getDate() + PLAN_PRICING[plan].duration);
      
      const checkResponse = await fetch("/api/check-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          planType: plan,
          startDate: start.toISOString(),
          endDate: end.toISOString()
        }),
      });
      
      const checkData = await checkResponse.json();
      
      if (!checkData.canSubscribe) {
        setErrorMessage(checkData.message);
        setIsLoading(false);
        return;
      }

      // 1. Create or fetch user
      const userRes = await fetch("/api/createUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          source,
          reference,
        }),      
      });
      const userData = await userRes.json();
      if (!userRes.ok || !userData.userId) throw new Error("User creation failed");
      console.log("User creation successful:", userData);      
      
      const userId = userData.userId;
      
      // 2. Create order/subscription (pending)
      const orderRes = await fetch("/api/createOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: price * 100,
          currency: "INR",
          planType: plan,
          duration: PLAN_PRICING[plan].duration,
          startDate,
          userId,
        }),
      });
      
      const orderData = await orderRes.json();
        
      // Check for error response due to existing subscription
      if (orderRes.status === 409) {
        setIsLoading(false);
        setErrorMessage(orderData.details || "You already have an active subscription.");
        return;
      }
      
      if (!orderRes.ok || !orderData.orderId) {
        throw new Error("Order creation failed: " + (orderData.message || "Unknown error"));
      }
      
      console.log("orderData:", orderData)


      const orderId = orderData.orderId;
      const subscriptionId = orderData.subscriptionId;      
      
      // 3. Start Razorpay payment
      if (!isRazorpayLoaded) {
        alert("Payment gateway is still loading. Please wait a moment and try again.");
        setIsLoading(false);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: price * 100,
        currency: "INR",
        name: "GOALETE CLUB",
        description: `Payment for ${plan} plan`,
        order_id: orderId,
        modal: {
            ondismiss: async function(response: any) {
                await fetch(`/api/createOrder?orderId=${orderId}`, { method: "DELETE" });
                console.log("deleted the order")
            }
        },        handler: async function (response: any) {
          try {
            // 4. On payment success, update subscription and user
            const updateResponse = await fetch("/api/createOrder", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                subscriptionId,
                orderId,
                paymentId: response.razorpay_payment_id,
                userId,
                paymentStatus: "succcess",
                status: "active",
              }),
            });
            
            // If subscription starts today, trigger immediate meeting invite
            if (isToday(startDate)) {
              await fetch("/api/send-meeting-invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  subscriptionId,
                  userId,
                  isImmediate: true
                }),
              });
            }
            
            alert("Payment Successful! Registration complete.");
          } catch (error) {
            alert("Payment verification or registration failed. Please contact support.");
            console.error(error);
          }
        },
        prefill: {
          name: `${firstName} ${lastName}`,
          email: email,
          contant: phone,
        },
        theme: {          
          color: "#3399cc",
        },
      };
      
      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", async function (response: any) {
        alert("Payment failed");
        try {
          await fetch("/api/createOrder", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                subscriptionId,
                orderId,
                paymentId: response.razorpay_payment_id,
                userId,
                paymentStaus: "failed",
                status: "inactive",
              }),
            });
          //
        } catch (err) {
          await fetch(`/api/createOrder?orderId=${orderId}`, { method: "DELETE" });
          console.log("delete the subscription order")
        }
        console.error(response.error);
      });
      razorpay.open();
    } catch (error) {
      console.error("Registration error:", error);
      
      // Extract meaningful error message
      let errorMsg = "Payment failed. Please try again.";
      if (error instanceof Error) {
        errorMsg = error.message;
      }
      
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 relative overflow-hidden">
      {/* Load Razorpay script */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setIsRazorpayLoaded(true)}
        onError={() => {
          console.error("Failed to load Razorpay script");
          alert("Payment gateway failed to load. Please refresh or try again later.");
        }}
      />
      
      {/* Watermark logo background */}
      <img
        src="/goalete_logo.jpeg"
        alt="GoAlete Watermark"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 w-[600px] h-[600px] object-contain pointer-events-none select-none z-0"
        aria-hidden="true"
      />
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-gray-200 space-y-8 relative z-10"
      >
        <div className="text-center mb-4 flex flex-col items-center gap-2">
          <img src="/goalete_logo.jpeg" alt="GoAlete Logo" className="w-24 h-24 rounded-full shadow border border-gray-200 bg-white object-cover" />
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight mb-1">GOALETE CLUB</h2>
          <p className="text-gray-500 text-base font-medium">How to Achieve Any Goal in Life</p>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:outline-none bg-gray-50 text-gray-900 placeholder:text-gray-400"
            required
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:outline-none bg-gray-50 text-gray-900 placeholder:text-gray-400"
            required
          />          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrorMessage(null);
            }}
            onBlur={() => {
              if (email && email.includes('@')) {
                checkSubscriptionConflict();
              }
            }}
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:outline-none bg-gray-50 text-gray-900 placeholder:text-gray-400"
            required
          />
          <input
            type="tel"
            placeholder="Phone No."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:outline-none bg-gray-50 text-gray-900 placeholder:text-gray-400"
            required
          />
        </div>        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <p className="font-semibold text-gray-700 mb-2">Subscription Plan</p>
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <label className="flex flex-col items-start w-full sm:w-1/2 cursor-pointer gap-1">
              <div className="flex items-center gap-2 w-full justify-start">                <input
                  type="radio"
                  name="plan"
                  value="single"
                  checked={plan === "single"}
                  onChange={() => {
                    handlePlanChange("single");
                    if (email && email.includes('@')) {
                      setTimeout(() => checkSubscriptionConflict(), 500);
                    }
                  }}
                  className="accent-gray-600"
                />
                <span className="text-gray-800">Single Session</span>
              </div>
              <span className="text-xs text-gray-400 font-medium pl-6">({PLAN_PRICING.single.display})</span>
            </label>
            <label className="flex flex-col items-end w-full sm:w-1/2 cursor-pointer gap-1">
              <div className="flex items-center gap-2 w-full justify-end">                <input
                  type="radio"
                  name="plan"
                  value="monthly"
                  checked={plan === "monthly"}
                  onChange={() => {
                    handlePlanChange("monthly");
                    if (email && email.includes('@')) {
                      setTimeout(() => checkSubscriptionConflict(), 500);
                    }
                  }}
                  className="accent-gray-600"
                />
                <span className="text-gray-800">Monthly Plan</span>
              </div>
              <span className="text-xs text-gray-400 font-medium pr-6">({PLAN_PRICING.monthly.display})</span>
            </label>
          </div>
        </div>        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <label className="block mb-1 font-medium text-gray-700">
            {plan === "single" ? "Session Date" : "Start Date"}
          </label>          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (email && email.includes('@')) {
                // Set timeout to avoid too many API calls while user is selecting
                setTimeout(() => checkSubscriptionConflict(), 500);
              }
            }}
            min={new Date().toISOString().split('T')[0]} // Prevent selecting dates before today
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:outline-none bg-white text-gray-900"
            required
          />
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <p className="font-semibold text-gray-700 mb-2">How did you hear about us?</p>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:outline-none bg-white text-gray-900"
          >
            <option>Instagram</option>
            <option>Facebook</option>
            <option>WhatsApp</option>
            <option>Word of Mouth</option>
            <option>Reference</option>
          </select>
          {source === "Reference" && (
            <input
              type="text"
              placeholder="Reference Name"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full p-3 mt-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:outline-none bg-white text-gray-900"
            />
          )}        </div>        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            <p className="font-medium text-sm">{errorMessage}</p>
            {isCheckingSubscription && (
              <div className="mt-2 flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700"></div>
              </div>
            )}
          </div>
        )}

        {isCheckingSubscription && !errorMessage && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
            <p className="font-medium text-sm">Checking subscription availability...</p>
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 rounded-xl shadow text-lg transition-all duration-200 tracking-wide mt-2 border border-gray-700"
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : "Buy Now"}
        </button>
      </form>
    </div>
  );
}