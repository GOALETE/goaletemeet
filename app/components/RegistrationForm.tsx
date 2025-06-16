"use client";
import { useState, useEffect, useCallback } from "react";
import Script from "next/script";
import Image from "next/image";
import { PLAN_PRICING, toPaise } from "@/lib/pricing";

// Declare the Razorpay interface
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function RegistrationForm() {
  // Basic form state
  const [plan, setPlan] = useState<"daily" | "monthly" | "monthlyFamily">("daily");
  const [startDate, setStartDate] = useState("");
  const [source, setSource] = useState("Instagram");
  const [reference, setReference] = useState("");
  
  // Payment state
  const [isRazorpayLoaded, setIsRazorpayLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Primary user information
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  
  // Second person fields for family plan
  const [secondFirstName, setSecondFirstName] = useState("");
  const [secondLastName, setSecondLastName] = useState("");
  const [secondEmail, setSecondEmail] = useState("");
  const [secondPhone, setSecondPhone] = useState("");
  
  // Additional state
  const [duration, setDuration] = useState(PLAN_PRICING.daily.duration);
  const [formData, setFormData] = useState<any>(null);
  
  // Status messages and validation
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  
  // Field-specific error tracking
  const [fieldErrors, setFieldErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    secondFirstName: '',
    secondLastName: '',
    secondEmail: '',
    secondPhone: ''
  });
  // Set today's date as the default start date when component mounts (using IST timezone)
  useEffect(() => {
    // Use IST timezone for date calculations
    const istDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    setStartDate(istDate.toISOString().split('T')[0]);
  }, []);
  
  // Validation rules for each field
  const validationRules = {
    firstName: (value: string) => {
      if (value.trim() === '') return 'First name is required';
      if (value.trim().length < 2) return 'First name must be at least 2 characters';
      return '';
    },
    lastName: (value: string) => {
      if (value.trim() === '') return 'Last name is required';
      if (value.trim().length < 2) return 'Last name must be at least 2 characters';
      return '';
    },
    email: (value: string) => {
      if (value.trim() === '') return 'Email is required';
      if (!value.includes('@') || !value.includes('.')) return 'Please enter a valid email address';
      return '';
    },
    phone: (value: string) => {
      if (value === '') return 'Phone number is required';
      if (value.length < 10) return 'Phone number must be at least 10 digits';
      if (value.length > 12) return 'Phone number is too long';
      return '';
    },
    secondEmail: (value: string, primaryEmail: string) => {
      if (value.trim() === '') return 'Email is required';
      if (!value.includes('@') || !value.includes('.')) return 'Please enter a valid email address';
      if (value === primaryEmail) return 'Second user cannot have the same email as the primary user';
      return '';
    }
  };
  
  // Helper function to handle input changes with fewer re-renders
  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, field: keyof typeof fieldErrors, value: string) => {
    setter(value);
    
    // Only clear errors if the field now has a value
    if (value.trim() !== '') {
      // Only update fieldErrors if there's an actual error to clear
      if (fieldErrors[field] !== '') {
        setFieldErrors(prev => ({...prev, [field]: ''}));
      }
    }
  };
  
  // Helper function to validate input fields on blur
  const validateField = (field: keyof typeof fieldErrors, value: string, validationRule: (val: string, ...args: any[]) => string, ...args: any[]) => {
    const error = validationRule(value, ...args);
    
    // Only update state if the error message has changed
    if (fieldErrors[field] !== error) {
      setFieldErrors(prev => ({...prev, [field]: error}));
    }
  };
  
  // Helper function to check if a date is today in IST timezone
  const isToday = (dateString: string): boolean => {
    if (!dateString) return false;
    const istDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const today = istDate.toISOString().split('T')[0];
    return dateString === today;
  };

  // Check for existing subscription conflicts - debounced implementation
  const checkSubscriptionConflict = useCallback(async () => {
    if (!email || !email.includes('@') || !startDate) return;
    setIsCheckingSubscription(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
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
        setSuccessMessage(null);
      } else {
        // Set success message when user can subscribe
        const planText = plan === 'daily' ? 'daily session' : 'monthly plan';
        let dateText = '';
        if (plan === 'daily') {
          dateText = `on ${formatDateDDMMYYYY(startDate)}`;
        } else {
          // Monthly: show full range (inclusive)
          const endDateObj = new Date(startDate);
          endDateObj.setDate(endDateObj.getDate() + PLAN_PRICING[plan].duration - 1);
          dateText = `from ${formatDateDDMMYYYY(startDate)} to ${formatDateDDMMYYYY(endDateObj.toISOString().split('T')[0])}`;
        }
        setSuccessMessage(`You can subscribe to the ${planText} ${dateText} (IST)!`);
        setErrorMessage(null);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
      setSuccessMessage(null);    
    } finally {
      setIsCheckingSubscription(false);
    }
  }, [email, plan, startDate]); // Dependencies are okay here
  
  // Check for subscription conflicts when user changes plan or date
  // Uses a debounce pattern to avoid too many API calls
  useEffect(() => {
    // Only check if email is entered
    if (email && email.includes('@')) {
      // Use a timer to avoid too many API calls during rapid changes
      const timer = setTimeout(() => {
        checkSubscriptionConflict();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [email, plan, startDate, checkSubscriptionConflict]); // Include all dependencies
  
  // Update duration when plan changes
  const handlePlanChange = (newPlan: "daily" | "monthly" | "monthlyFamily") => {
    setPlan(newPlan);
    setDuration(PLAN_PRICING[newPlan].duration);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    // Clear field errors on plan change
    setFieldErrors({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      secondFirstName: '',
      secondLastName: '',
      secondEmail: '',
      secondPhone: ''
    });
    
    // Clear second person fields if not family plan
    if (newPlan !== "monthlyFamily") {
      setSecondFirstName("");
      setSecondLastName("");
      setSecondEmail("");
      setSecondPhone("");   
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for field validation errors before proceeding
    const newFieldErrors = {
      firstName: validationRules.firstName(firstName),
      lastName: validationRules.lastName(lastName),
      email: validationRules.email(email),
      phone: validationRules.phone(phone),
      secondFirstName: plan === 'monthlyFamily' ? validationRules.firstName(secondFirstName) : '',
      secondLastName: plan === 'monthlyFamily' ? validationRules.lastName(secondLastName) : '',
      secondEmail: plan === 'monthlyFamily' ? validationRules.secondEmail(secondEmail, email) : '',
      secondPhone: plan === 'monthlyFamily' ? validationRules.phone(secondPhone) : ''
    };
    
    // Check if Reference is required but empty
    if (source === "Reference" && reference.trim() === '') {
      setErrorMessage("Please provide a reference name");
      return;
    }
    
    // Check if there are any validation errors
    if (Object.values(newFieldErrors).some(error => error !== '')) {
      setFieldErrors(newFieldErrors);
      return;
    }
    
    // Additional check for family plan - emails must be different
    if (plan === 'monthlyFamily' && email === secondEmail) {
      setErrorMessage("Primary and secondary users must have different email addresses");
      setFieldErrors({
        ...newFieldErrors,
        secondEmail: 'Second user cannot have the same email as the primary user'
      });
      return;
    }
    
    setIsLoading(true);
    setErrorMessage(null); // Reset error message on new submission
    setSuccessMessage(null); // Reset success message on new submission
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
    });        
    try {
      const price = PLAN_PRICING[plan].amount;
      
      // Double-check subscription availability (using IST dates)
      const start = new Date(startDate); // startDate from form input is already in IST
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

      // 1. Create or fetch primary user
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
      if (!userRes.ok || !userData.userId) throw new Error("Primary user creation failed");
      console.log("Primary user creation successful:", userData);      
      
      const userId = userData.userId;
      
      // For family plan, create or fetch second user
      let secondUserId = null;
      if (plan === "monthlyFamily") {
        const secondUserRes = await fetch("/api/createUser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: secondFirstName,
            lastName: secondLastName,
            email: secondEmail,
            phone: secondPhone,
            source: "Family Plan",
            reference: "",
          }),      
        });
        const secondUserData = await secondUserRes.json();
        if (!secondUserRes.ok || !secondUserData.userId) throw new Error("Second user creation failed");
        console.log("Second user creation successful:", secondUserData);
        secondUserId = secondUserData.userId;
      }
      
      // 2. Create order/subscription (pending)      
      const orderRes = await fetch("/api/createOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: toPaise(price), // Convert INR to paise (smallest currency unit)
          currency: "INR",
          planType: plan,
          duration: PLAN_PRICING[plan].duration,
          startDate,
          userId,
          ...(plan === "monthlyFamily" ? {
            secondUserId
          } : {})
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
      // For family plan, get both subscription IDs
      const subscriptionIds = orderData.subscriptionIds || (orderData.subscriptionId ? [orderData.subscriptionId] : []);
      
      // 3. Start Razorpay payment
      if (!isRazorpayLoaded) {
        alert("Payment gateway is still loading. Please wait a moment and try again.");
        setIsLoading(false);
        return;
      }
      const isFamily = plan === "monthlyFamily";
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: toPaise(price),
        currency: "INR",
        name: "GOALETE CLUB",
        description: `Payment for ${plan} plan`,
        order_id: orderId,
        modal: {
            ondismiss: async function(response: any) {
                await fetch(`/api/createOrder?orderId=${orderId}`, { method: "DELETE" });
                console.log("deleted the order")
            }
        },
        handler: async function (response: any) {
          try {
            // 4. On payment success, update subscription(s) and user(s)
            await fetch("/api/createOrder", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId,
                paymentId: response.razorpay_payment_id,
                userId, // still pass for compatibility
                ...(isFamily
                  ? { subscriptionIds }
                  : { subscriptionId: subscriptionIds[0] }),
                status: "active",
                paymentStatus: "success"
              }),
            });
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
                orderId,
                paymentId: response.razorpay_payment_id,
                userId,
                ...(isFamily
                  ? { subscriptionIds }
                  : { subscriptionId: subscriptionIds[0] }),
                paymentStatus: "failed",
                status: "inactive",
              }),
            });
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
  
  // Helper to format date as dd/mm/yyyy
  function formatDateDDMMYYYY(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Create a wrapper component for form autofill detection
  useEffect(() => {
    // This workaround helps trigger browser autofill in some browsers
    const autofillTrigger = () => {
      // Create a hidden input to force autofill detection
      const hiddenInput = document.createElement('input');
      hiddenInput.style.display = 'none';
      hiddenInput.name = 'hidden-trigger';
      hiddenInput.setAttribute('autocomplete', 'on');
      
      // Append and remove to trigger autofill
      const form = document.querySelector('form');
      if (form) {
        form.appendChild(hiddenInput);
        setTimeout(() => {
          hiddenInput.focus();
          setTimeout(() => {
            document.activeElement && (document.activeElement as HTMLElement).blur();
            form.removeChild(hiddenInput);
          }, 500);
        }, 500);
      }
    };
    
    // Run the trigger after a delay
    const timer = setTimeout(autofillTrigger, 1000);
    return () => clearTimeout(timer);
  }, []);

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
      <Image
        src="/goalete_logo.jpeg"
        alt="Goalete Watermark"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 w-[600px] h-[600px] object-contain pointer-events-none select-none z-0"
        aria-hidden="true"
        width={600}
        height={600}
      />
        <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-gray-200 space-y-8 relative z-10"
        autoComplete="on"
      >
        <div className="text-center mb-4 flex flex-col items-center gap-2">
          <Image src="/goalete_logo.jpeg" alt="Goalete Logo" className="w-24 h-24 rounded-full shadow border border-gray-200 bg-white object-cover" width={96} height={96} />
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight mb-1">GOALETE CLUB</h2>
          <p className="text-gray-500 text-base font-medium">How to Achieve Any Goal in Life</p>
        </div>

        {/* Primary User Information - FIRST */}
        <div className="space-y-4">
          <p className="font-semibold text-gray-700 mb-2">Your Information</p>          
          <input
            type="text"
            name="firstName"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => handleInputChange(setFirstName, 'firstName', e.target.value)}
            onBlur={() => validateField('firstName', firstName, validationRules.firstName)}
            className={`w-full p-3 border ${fieldErrors.firstName ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-gray-400 focus:outline-none bg-gray-50 text-gray-900 placeholder:text-gray-400`}
            autoComplete="given-name"
            required
          />
          {fieldErrors.firstName && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.firstName}</p>
          )}
            <input
            type="text"
            name="lastName"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => handleInputChange(setLastName, 'lastName', e.target.value)}
            onBlur={() => validateField('lastName', lastName, validationRules.lastName)}
            className={`w-full p-3 border ${fieldErrors.lastName ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-gray-400 focus:outline-none bg-gray-50 text-gray-900 placeholder:text-gray-400`}
            autoComplete="family-name"
            required
          />
          {fieldErrors.lastName && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.lastName}</p>
          )}
            <input
            type="email"
            name="email"
            placeholder="Email"
            value={email}
            onChange={(e) => {
              handleInputChange(setEmail, 'email', e.target.value);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            onBlur={() => {
              validateField('email', email, validationRules.email);
              if (email && email.includes('@') && !fieldErrors.email) {
                checkSubscriptionConflict();
              }
            }}
            className={`w-full p-3 border ${fieldErrors.email ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-gray-400 focus:outline-none bg-gray-50 text-gray-900 placeholder:text-gray-400`}
            autoComplete="email"
            required
          />
          {fieldErrors.email && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
          )}
            <input
            type="tel"
            name="phone"
            placeholder="Phone No."
            value={phone}
            onChange={(e) => {
              // Only allow digits in phone number
              const value = e.target.value.replace(/\D/g, '');
              handleInputChange(setPhone, 'phone', value);
            }}
            onBlur={() => validateField('phone', phone, validationRules.phone)}
            className={`w-full p-3 border ${fieldErrors.phone ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-gray-400 focus:outline-none bg-gray-50 text-gray-900 placeholder:text-gray-400`}
            autoComplete="tel"
            required
          />
          {fieldErrors.phone && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.phone}</p>
          )}
        </div>        {/* Subscription Plan Section - SECOND */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <p className="font-semibold text-gray-700 mb-2">Subscription Plan</p>
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <label className="relative flex flex-col w-full sm:w-1/3 cursor-pointer gap-1 p-3 transition-all duration-200 rounded-lg hover:bg-gray-100">
              <div className="flex items-center gap-2 w-full">
                <input
                  type="radio"
                  name="plan"
                  value="daily"
                  checked={plan === "daily"}
                  onChange={() => handlePlanChange("daily")}
                  className="accent-blue-600"
                />
                <div>
                  <div className="flex items-center">
                    <span className="text-gray-800 font-medium">Daily Session</span>
                    <div className="group relative ml-1">
                      <span className="cursor-help text-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                      <div className="absolute z-10 w-64 p-3 bg-blue-700 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 bottom-full left-1/2 transform -translate-x-1/2 mb-2">
                        {PLAN_PRICING.daily.description}
                        <div className="absolute w-3 h-3 bg-blue-700 transform rotate-45 left-1/2 -translate-x-1/2 -bottom-1.5"></div>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">{PLAN_PRICING.daily.display}</span>
                </div>
              </div>
            </label>
            <label className="relative flex flex-col w-full sm:w-1/3 cursor-pointer gap-1 p-3 transition-all duration-200 rounded-lg hover:bg-gray-100">
              <div className="flex items-center gap-2 w-full">
                <input
                  type="radio"
                  name="plan"
                  value="monthly"
                  checked={plan === "monthly"}
                  onChange={() => handlePlanChange("monthly")}
                  className="accent-blue-600"
                />
                <div>
                  <div className="flex items-center">
                    <span className="text-gray-800 font-medium">Monthly Plan</span>
                    <div className="group relative ml-1">
                      <span className="cursor-help text-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                      <div className="absolute z-10 w-64 p-3 bg-blue-700 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 bottom-full left-1/2 transform -translate-x-1/2 mb-2">
                        {PLAN_PRICING.monthly.description}
                        <div className="absolute w-3 h-3 bg-blue-700 transform rotate-45 left-1/2 -translate-x-1/2 -bottom-1.5"></div>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">{PLAN_PRICING.monthly.display}</span>
                </div>
              </div>
            </label>
            <label className="relative flex flex-col w-full sm:w-1/3 cursor-pointer gap-1 p-3 transition-all duration-200 rounded-lg hover:bg-gray-100">
              <div className="flex items-center gap-2 w-full">
                <input
                  type="radio"
                  name="plan"
                  value="monthlyFamily"
                  checked={plan === "monthlyFamily"}
                  onChange={() => handlePlanChange("monthlyFamily")}
                  className="accent-blue-600"
                />
                <div>
                  <div className="flex items-center">
                    <span className="text-gray-800 font-medium">Monthly Family</span>
                    <div className="group relative ml-1">
                      <span className="cursor-help text-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                      <div className="absolute z-10 w-64 p-3 bg-blue-700 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 bottom-full left-1/2 transform -translate-x-1/2 mb-2">
                        {PLAN_PRICING.monthlyFamily.description}
                        <div className="absolute w-3 h-3 bg-blue-700 transform rotate-45 left-1/2 -translate-x-1/2 -bottom-1.5"></div>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">{PLAN_PRICING.monthlyFamily.display}</span>
                </div>
              </div>
            </label>
          </div>
        </div>
        
        {/* Show second person fields if family plan is selected - THIRD (conditional) */}
        {plan === "monthlyFamily" && (
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <p className="font-semibold text-yellow-700 mb-2">Second Person Details (Family Plan)</p>
            <div className="space-y-4">              <input
                type="text"
                name="secondFirstName"
                placeholder="Second Person First Name"
                value={secondFirstName}
                onChange={(e) => handleInputChange(setSecondFirstName, 'secondFirstName', e.target.value)}
                onBlur={() => validateField('secondFirstName', secondFirstName, validationRules.firstName)}
                className={`w-full p-3 border ${fieldErrors.secondFirstName ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none bg-yellow-50 text-gray-900 placeholder:text-gray-400`}
                autoComplete="off"
                required={plan === "monthlyFamily"}
              />
              {fieldErrors.secondFirstName && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.secondFirstName}</p>
              )}              <input
                type="text"
                name="secondLastName"
                placeholder="Second Person Last Name"
                value={secondLastName}
                onChange={(e) => handleInputChange(setSecondLastName, 'secondLastName', e.target.value)}
                onBlur={() => validateField('secondLastName', secondLastName, validationRules.lastName)}
                className={`w-full p-3 border ${fieldErrors.secondLastName ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none bg-yellow-50 text-gray-900 placeholder:text-gray-400`}
                autoComplete="off"
                required={plan === "monthlyFamily"}
              />
              {fieldErrors.secondLastName && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.secondLastName}</p>
              )}              <input
                type="email"
                name="secondEmail"
                placeholder="Second Person Email"
                value={secondEmail}
                onChange={(e) => {
                  handleInputChange(setSecondEmail, 'secondEmail', e.target.value);
                  // Clear the general error message if it was about duplicate emails
                  if (errorMessage === "Primary and secondary users must have different email addresses" && 
                      e.target.value !== email) {
                    setErrorMessage(null);
                  }
                }}
                onBlur={() => validateField('secondEmail', secondEmail, validationRules.secondEmail, email)}
                className={`w-full p-3 border ${fieldErrors.secondEmail ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none bg-yellow-50 text-gray-900 placeholder:text-gray-400`}
                autoComplete="off"
                required={plan === "monthlyFamily"}
              />
              {fieldErrors.secondEmail && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.secondEmail}</p>
              )}              <input
                type="tel"
                name="secondPhone"
                placeholder="Second Person Phone No."
                value={secondPhone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  handleInputChange(setSecondPhone, 'secondPhone', value);
                }}
                onBlur={() => validateField('secondPhone', secondPhone, validationRules.phone)}
                className={`w-full p-3 border ${fieldErrors.secondPhone ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none bg-yellow-50 text-gray-900 placeholder:text-gray-400`}
                autoComplete="off"
                required={plan === "monthlyFamily"}
              />
              {fieldErrors.secondPhone && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.secondPhone}</p>
              )}
            </div>
          </div>
        )}
        
        {/* Date Selector Section - FOURTH */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <p className="font-semibold text-gray-700 mb-2">Select Start Date</p>
          <div className="w-full">            <input
              type="date"
              name="startDate"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              min={new Date().toISOString().split('T')[0]} // Set min to current date
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:outline-none bg-gray-50 text-gray-900"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {plan === 'daily' 
                ? 'Select the date for your daily session (IST)' 
                : `Select start date for your ${plan === 'monthlyFamily' ? 'family ' : ''}plan (IST)`}

            </p>
          </div>
        </div>

        {/* Source (How did you hear about us) Section - FIFTH */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <p className="font-semibold text-gray-700 mb-2">How did you hear about us?</p>
          <div className="w-full">            <select
              name="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:outline-none bg-gray-50 text-gray-900"
              required
            >
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
              <option value="Twitter">Twitter</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Google">Google</option>
              <option value="Friend">Friend</option>
              <option value="Reference">Reference/Referral</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Reference field (shown only if source is "Reference") */}
        {source === "Reference" && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="font-semibold text-gray-700 mb-2">Reference Name</p>
            <input              type="text"
              name="reference"
              placeholder="Enter reference name"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:outline-none bg-gray-50 text-gray-900 placeholder:text-gray-400"
              autoComplete="off"
            />
          </div>
        )}
        
        {/* Error or success message */}
        {(errorMessage || successMessage) && (
          <div className={`p-4 rounded-lg ${errorMessage ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <p className={`text-sm ${errorMessage ? 'text-red-700' : 'text-green-700'}`}>
              {errorMessage || successMessage}
            </p>
          </div>
        )}

        {/* Submit button */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="submit"
            className="w-full px-4 py-3 text-white bg-gray-800 rounded-lg shadow hover:bg-gray-700 focus:outline-none transition-all duration-200"
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Register & Pay Now"}
          </button>
        </div>
      </form>
    </div>
  );
}