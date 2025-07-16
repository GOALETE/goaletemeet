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

export default function RegistrationForm() {  // Add custom styles for 3D card flip
  useEffect(() => {
    // Add the custom CSS needed for card flipping
    const style = document.createElement('style');
    style.textContent = `
      .perspective-1000 {
        perspective: 1000px;
      }
      .transform-style-3d {
        transform-style: preserve-3d;
      }
      .backface-hidden {
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
      }
      .rotate-y-180 {
        transform: rotateY(180deg);
      }
      .flip-card-back {
        transform: rotateY(180deg);
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }
      @keyframes shimmer {
        0% {
          transform: translateX(-100%);
        }
        100% {
          transform: translateX(100%);
        }
      }
      .animate-shimmer {
        animation: shimmer 2s infinite;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
  
  // Card flip state
  const [flippedCard, setFlippedCard] = useState<string | null>(null);
  
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
    
    // For family plans, also check if second email is provided
    if (plan === "monthlyFamily" && (!secondEmail || !secondEmail.includes('@'))) {
      return; // Don't check until both emails are provided
    }
    
    setIsCheckingSubscription(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      const start = new Date(startDate);
      const end = new Date(startDate);
      end.setDate(end.getDate() + PLAN_PRICING[plan].duration);
      
      // Prepare emails array - for family plans, check both emails
      const emailsToCheck = plan === "monthlyFamily" ? [email.toLowerCase(), secondEmail.toLowerCase()] : [email.toLowerCase()];
      
      const response = await fetch("/api/check-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: emailsToCheck, // Changed from single email to array
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
        // Set success message when user(s) can subscribe
        const planText = plan === 'daily' ? 'daily session' : plan === 'monthlyFamily' ? 'family monthly plan' : 'monthly plan';
        let dateText = '';
        if (plan === 'daily') {
          dateText = `on ${formatDateDDMMYYYY(startDate)}`;
        } else {
          // Monthly: show full range (inclusive)
          const endDateObj = new Date(startDate);
          endDateObj.setDate(endDateObj.getDate() + PLAN_PRICING[plan].duration - 1);
          dateText = `from ${formatDateDDMMYYYY(startDate)} to ${formatDateDDMMYYYY(endDateObj.toISOString().split('T')[0])}`;
        }
        
        const userText = plan === "monthlyFamily" ? "Both users" : "You";
        setSuccessMessage(`${userText} can subscribe to the ${planText} ${dateText} (IST)!`);
        setErrorMessage(null);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
      setSuccessMessage(null);    
    } finally {
      setIsCheckingSubscription(false);
    }
  }, [email, secondEmail, plan, startDate]); // Added secondEmail to dependencies
  
  // Check for subscription conflicts when user changes plan or date
  useEffect(() => {
    // Only check if primary email is entered
    if (email && email.includes('@')) {
      // For family plans, also wait for second email
      if (plan === "monthlyFamily" && (!secondEmail || !secondEmail.includes('@'))) {
        return; // Don't check until both emails are provided
      }
      
      // Use a timer to avoid too many API calls during rapid changes
      const timer = setTimeout(() => {
        checkSubscriptionConflict();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [email, secondEmail, plan, startDate, checkSubscriptionConflict]); // Added secondEmail to dependencies
  
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
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      const price = PLAN_PRICING[plan].amount;
      
      // Double-check subscription availability (using IST dates)
      const start = new Date(startDate);
      const end = new Date(startDate);
      end.setDate(end.getDate() + PLAN_PRICING[plan].duration);
      
      // Prepare emails array for checking
      const emailsToCheck = plan === "monthlyFamily" ? [email.toLowerCase(), secondEmail.toLowerCase()] : [email.toLowerCase()];
      
      const checkResponse = await fetch("/api/check-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: emailsToCheck, // Changed from single email to array
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
          email: email.toLowerCase(),
          phone,
          source,
          reference,
        }),      
      });
      const userData = await userRes.json();
      if (!userRes.ok || !userData.userId) throw new Error("Primary user creation failed");
      
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
            email: secondEmail.toLowerCase(),
            phone: secondPhone,
            source: "Family Plan",
            reference: "",
          }),      
        });
        const secondUserData = await secondUserRes.json();
        if (!secondUserRes.ok || !secondUserData.userId) throw new Error("Second user creation failed");
        secondUserId = secondUserData.userId;
      }
      
      // 2. Create order/subscription (pending)      
      const orderRes = await fetch("/api/createOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: toPaise(price),
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
                userId,
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

  return (    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
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
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <Image
            src="/goalete_logo.jpeg"
            alt="Goalete Watermark"
            className="opacity-5 select-none"
            aria-hidden="true"
            width={800}
            height={800}
            priority
          />
        </div>
      </div>
      
      <div className="w-full max-w-4xl overflow-visible"><form
          onSubmit={handleSubmit}
          className="w-full bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-200 space-y-6 relative z-10 overflow-visible"
          autoComplete="on"
        >
          <div className="text-center mb-6 flex flex-col items-center gap-2">
            <div className="relative w-24 h-24 mb-2">
              <Image 
                src="/goalete_logo.jpeg" 
                alt="Goalete Logo" 
                className="rounded-full shadow-md border border-gray-200 bg-white object-cover" 
                fill
                sizes="(max-width: 768px) 96px, 96px"
                priority
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight mb-1">GOALETE CLUB</h1>
            <p className="text-gray-500 text-lg font-medium">How to Achieve Any Goal in Life</p>
          </div>

          {/* Primary User Information */}
          <div className="rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 py-3 px-4 border-b border-blue-200">
              <p className="font-semibold text-blue-800 flex items-center">
                <svg className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Your Information
              </p>
            </div>
            <div className="p-5 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => handleInputChange(setFirstName, 'firstName', e.target.value)}
                    onBlur={() => validateField('firstName', firstName, validationRules.firstName)}
                    className={`w-full p-3 border ${fieldErrors.firstName ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none bg-white text-gray-900 placeholder:text-gray-400 transition duration-200`}
                    autoComplete="given-name"
                    required
                  />
                  {fieldErrors.firstName && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.firstName}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => handleInputChange(setLastName, 'lastName', e.target.value)}
                    onBlur={() => validateField('lastName', lastName, validationRules.lastName)}
                    className={`w-full p-3 border ${fieldErrors.lastName ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none bg-white text-gray-900 placeholder:text-gray-400 transition duration-200`}
                    autoComplete="family-name"
                    required
                  />
                  {fieldErrors.lastName && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.lastName}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email Address"
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
                    className={`w-full p-3 border ${fieldErrors.email ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none bg-white text-gray-900 placeholder:text-gray-400 transition duration-200`}
                    autoComplete="email"
                    required
                  />
                  {fieldErrors.email && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone Number"
                    value={phone}
                    onChange={(e) => {
                      // Only allow digits in phone number
                      const value = e.target.value.replace(/\D/g, '');
                      handleInputChange(setPhone, 'phone', value);
                    }}
                    onBlur={() => validateField('phone', phone, validationRules.phone)}
                    className={`w-full p-3 border ${fieldErrors.phone ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none bg-white text-gray-900 placeholder:text-gray-400 transition duration-200`}
                    autoComplete="tel"
                    required
                  />
                  {fieldErrors.phone && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.phone}</p>
                  )}                </div>
              </div>
            </div>
          </div>
          
          {/* Plan Selection Section */}
          <div className="overflow-visible">
            <div className="mb-4">
              <p className="font-semibold text-gray-700 flex items-center before:content-[''] before:block before:w-2 before:h-5 before:mr-2 before:bg-blue-600 before:rounded-sm">
                Choose Your Plan
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-full overflow-visible mb-12">              {/* Daily Plan */}              <div 
                onClick={(e) => {
                  // Don't handle click if info button was clicked
                  if (!(e.target as HTMLElement).closest('.info-btn')) {
                    handlePlanChange("daily");
                  }
                }}                className={`                  relative rounded-xl shadow-md transition-all duration-300 cursor-pointer h-[420px] perspective-1000 max-w-full overflow-hidden
                  ${plan === "daily" 
                    ? "ring-2 ring-offset-2 ring-blue-500 transform scale-[1.02]" 
                    : "hover:shadow-lg hover:translate-y-[-4px] border border-gray-200"
                  }
                `}>
                {plan === "daily" && (
                  <div className="absolute top-0 right-0 z-2">
                    <div className="bg-blue-600 text-white py-1 px-4 text-xs font-bold shadow-md rounded-bl-md">
                      SELECTED
                    </div>
                  </div>
                )}
                
                <div className={`flip-card-inner relative w-full h-full transition-transform duration-700 transform-style-3d ${flippedCard === 'daily' ? 'rotate-y-180' : ''}`}>
                  {/* Card Front */}
                  <div className="flex flex-col h-[420px]">
                    {/* Header (fixed height) */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 border-b border-blue-200 rounded-t-xl flex-shrink-0" style={{ minHeight: 80 }}>
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="font-bold text-gray-800 text-sm sm:text-base md:text-lg truncate">{PLAN_PRICING.daily.name}</h3>                        <button 
                          type="button"
                          className="text-blue-500 hover:text-blue-700 focus:outline-none info-btn z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-all duration-200 shadow-sm hover:shadow"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFlippedCard(flippedCard === 'daily' ? null : 'daily');
                          }}
                          aria-label="More information"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      </div>
                      <div className="text-blue-600 font-bold text-lg sm:text-xl md:text-2xl mb-1">{PLAN_PRICING.daily.display}</div>
                      <div className="text-gray-500 text-xs">Start your transformation journey</div>
                    </div>
                    {/* Content (flex-grow) */}
                    <div className="flex-grow flex flex-col justify-start px-4 py-2 bg-white">
                      <ul className="space-y-2 mb-2">
                        <li className="flex items-start">
                          <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-xs sm:text-sm text-gray-600 leading-tight">Complete transformative single session</span>
                        </li>
                        <li className="flex items-start">
                          <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-xs sm:text-sm text-gray-600 leading-tight">Powerful goal-setting techniques</span>
                        </li>
                        <li className="flex items-start">
                          <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-xs sm:text-sm text-gray-600 leading-tight">Choose any available date</span>
                        </li>
                      </ul>
                    </div>
                    {/* Button (fixed height) */}
                    <div className="px-4 pb-4 pt-2 flex-shrink-0">
                      <label className="flex items-center justify-center">
                        <input
                          type="radio"
                          name="plan"
                          value="daily"
                          checked={plan === "daily"}
                          onChange={() => handlePlanChange("daily")}
                          className="sr-only"
                        />
                        <div className={`
                          w-full py-2 px-4 rounded-md font-medium text-center transition-colors
                          ${plan === "daily" 
                            ? "bg-blue-600 text-white" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }
                        `}>
                          {plan === "daily" ? "Selected" : "Select Plan"}
                        </div>
                      </label>
                    </div>
                  </div>                    {/* Card Back */}
                  <div className="flip-card-back absolute w-full h-full backface-hidden bg-blue-600 text-white p-5 rounded-xl">
                    <div className="flex flex-col h-full">
                      {/* Close button at the top */}
                      <div className="flex-shrink-0 flex justify-end p-2">
                        <button 
                          type="button"
                          className="text-white hover:text-blue-100 focus:outline-none info-btn z-30 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/30 transition-all duration-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFlippedCard(null);
                          }}
                          aria-label="Close details"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                        {/* Description/content area */}
                      <div className="flex-grow flex flex-col justify-start px-4 py-2">
                        <h3 className="font-bold text-xl mb-4 mt-2">{PLAN_PRICING.daily.name}</h3>
                        <p className="text-sm mb-6">{PLAN_PRICING.daily.description}</p>
                      </div>
                      
                      {/* Button at the bottom - fixed positioning */}
                      <div className="mt-auto px-4 pb-4 flex-shrink-0">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlanChange("daily");
                            setFlippedCard(null);
                          }} 
                          className="bg-white text-blue-600 py-2 px-4 rounded-md font-medium hover:bg-blue-50 transition-colors w-full"
                        >
                          {plan === "daily" ? "Already Selected" : "Select This Plan"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>                {/* Monthly Plan */}              <div 
                onClick={(e) => {
                  // Don't handle click if info button was clicked
                  if (!(e.target as HTMLElement).closest('.info-btn')) {
                    handlePlanChange("monthly");
                  }
                }}                className={`
                  relative rounded-xl shadow-md transition-all duration-300 cursor-pointer h-[420px] perspective-1000 max-w-full overflow-hidden
                  ${plan === "monthly" 
                    ? "ring-2 ring-offset-2 ring-blue-500 transform scale-[1.02]"                    : "hover:shadow-lg hover:translate-y-[-4px] border border-gray-200"
                  }
                `}>
                {/* SELECTED ribbon */}
                {plan === "monthly" && (
                  <div className="absolute top-0 right-0 z-2">
                    <div className="bg-indigo-600 text-white py-1 px-4 text-xs font-bold shadow-md rounded-bl-md">
                      SELECTED
                    </div>
                  </div>
                )}
                
                {/* POPULAR ribbon */}
                <div className="absolute top-0 left-0 z-2">
                  <div className="bg-purple-600 text-white py-1 px-4 text-xs font-bold shadow-md rounded-br-md">
                    POPULAR
                  </div>
                </div>
                
                <div className={`flip-card-inner relative w-full h-full transition-transform duration-700 transform-style-3d ${flippedCard === 'monthly' ? 'rotate-y-180' : ''}`}>
                  {/* Card Front */}
                  <div className="flex flex-col h-[420px]">
                    {/* Header (fixed height) */}
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 border-b border-indigo-200 rounded-t-xl flex-shrink-0" style={{ minHeight: 80 }}>
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="font-bold text-gray-800 text-sm sm:text-base md:text-lg truncate">{PLAN_PRICING.monthly.name}</h3>                        <button 
                          type="button"
                          className="text-indigo-500 hover:text-indigo-700 focus:outline-none info-btn z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-all duration-200 shadow-sm hover:shadow"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFlippedCard(flippedCard === 'monthly' ? null : 'monthly');
                          }}
                          aria-label="More information"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      </div>
                      <div className="text-indigo-600 font-bold text-lg sm:text-xl md:text-2xl mb-1">{PLAN_PRICING.monthly.display}</div>
                      <div className="text-gray-500 text-xs">Sustained motivation for real change</div>
                    </div>
                    {/* Content (flex-grow) */}
                    <div className="flex-grow flex flex-col justify-start px-4 py-2 bg-white">
                      <ul className="space-y-2 mb-2">
                        <li className="flex items-start">
                          <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-xs sm:text-sm text-gray-600 leading-tight">Daily motivation for a full month</span>
                        </li>
                        <li className="flex items-start">
                          <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-xs sm:text-sm text-gray-600 leading-tight">Consistent approach for better results</span>
                        </li>
                        <li className="flex items-start">
                          <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-xs sm:text-sm text-gray-600 leading-tight">Save over 70% vs daily rate</span>
                        </li>
                      </ul>
                    </div>
                    {/* Button (fixed height) */}
                    <div className="px-4 pb-4 pt-2 flex-shrink-0">
                      <label className="flex items-center justify-center">
                        <input
                          type="radio"
                          name="plan"
                          value="monthly"
                          checked={plan === "monthly"}
                          onChange={() => handlePlanChange("monthly")}
                          className="sr-only"
                        />
                        <div className={`
                          w-full py-2 px-4 rounded-md font-medium text-center transition-colors
                          ${plan === "monthly" 
                            ? "bg-indigo-600 text-white" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }
                        `}>
                          {plan === "monthly" ? "Selected" : "Select Plan"}
                        </div>
                      </label>
                    </div>
                  </div>
                    {/* Card Back */}                  <div className="flip-card-back absolute w-full h-full backface-hidden bg-indigo-600 text-white p-5 rounded-xl">
                    <div className="flex flex-col h-full">
                      {/* Close button at the top */}
                      <div className="flex-shrink-0 flex justify-end p-2">
                        <button 
                          type="button"
                          className="text-white hover:text-indigo-100 focus:outline-none info-btn z-30 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/30 transition-all duration-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFlippedCard(null);
                          }}
                          aria-label="Close details"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                        {/* Description/content area */}
                      <div className="flex-grow flex flex-col justify-start px-4 py-2">
                        <h3 className="font-bold text-xl mb-4 mt-2">{PLAN_PRICING.monthly.name}</h3>
                        <p className="text-sm mb-6">{PLAN_PRICING.monthly.description}</p>
                      </div>
                      
                      {/* Button at the bottom - fixed positioning */}
                      <div className="mt-auto px-4 pb-4 flex-shrink-0">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlanChange("monthly");
                            setFlippedCard(null);
                          }} 
                          className="bg-white text-indigo-600 py-2 px-4 rounded-md font-medium hover:bg-indigo-50 transition-colors w-full"
                        >
                          {plan === "monthly" ? "Already Selected" : "Select This Plan"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>                {/* Family Plan */}              <div 
                onClick={(e) => {
                  // Don't handle click if info button was clicked
                  if (!(e.target as HTMLElement).closest('.info-btn')) {
                    handlePlanChange("monthlyFamily");                  }
                }}                className={`
                  relative rounded-xl shadow-md transition-all duration-300 cursor-pointer h-[420px] perspective-1000 max-w-full overflow-hidden
                  ${plan === "monthlyFamily" 
                    ? "ring-2 ring-offset-2 ring-blue-500 transform scale-[1.02]" 
                    : "hover:shadow-lg hover:translate-y-[-4px] border border-gray-200"
                  }                `}>
                {/* SELECTED ribbon */}
                {plan === "monthlyFamily" && (
                  <div className="absolute top-0 right-0 z-2">
                    <div className="bg-amber-600 text-white py-1 px-4 text-xs font-bold shadow-md rounded-bl-md">
                      SELECTED
                    </div>
                  </div>
                )}
                
                {/* BEST VALUE ribbon */}
                <div className="absolute top-0 left-0 z-2">
                  <div className="bg-amber-600 text-white py-1 px-4 text-xs font-bold shadow-md rounded-br-md">
                    BEST VALUE
                  </div>
                </div>
                
                <div className={`flip-card-inner relative w-full h-full transition-transform duration-700 transform-style-3d ${flippedCard === 'monthlyFamily' ? 'rotate-y-180' : ''}`}>
                  {/* Card Front */}
                  <div className="flex flex-col h-[420px]">
                    {/* Header (fixed height) */}
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 border-b border-amber-200 rounded-t-xl flex-shrink-0" style={{ minHeight: 80 }}>                      <div className="flex justify-between items-center mb-1">
                        <h3 className="font-bold text-gray-800 text-sm sm:text-base md:text-lg truncate">{PLAN_PRICING.monthlyFamily.name}</h3>                        <button 
                          type="button"
                          className="text-amber-500 hover:text-amber-700 focus:outline-none info-btn z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-all duration-200 shadow-sm hover:shadow"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFlippedCard(flippedCard === 'monthlyFamily' ? null : 'monthlyFamily');
                          }}
                          aria-label="More information"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      </div>
                      <div className="text-amber-600 font-bold text-lg sm:text-xl md:text-2xl mb-1 flex items-center">{PLAN_PRICING.monthlyFamily.display} <span className="text-xs font-normal text-gray-500 ml-1 mt-1">• 2 users</span></div>
                      <div className="text-gray-500 text-xs">Achieve more together, save more together</div>
                    </div>
                    {/* Content (flex-grow) */}
                    <div className="flex-grow flex flex-col justify-start px-4 py-2 bg-white">
                      <ul className="space-y-2 mb-2">
                        <li className="flex items-start">
                          <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-xs sm:text-sm text-gray-600 leading-tight">Full access for 2 people for 30 days</span>
                        </li>
                        <li className="flex items-start">
                          <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-xs sm:text-sm text-gray-600 leading-tight">Achieve goals together with a partner</span>
                        </li>
                        <li className="flex items-start">
                          <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-xs sm:text-sm text-gray-600 leading-tight">25% savings vs 2 monthly plans</span>
                        </li>
                      </ul>
                    </div>
                    {/* Button (fixed height) */}
                    <div className="px-4 pb-4 pt-2 flex-shrink-0">
                      <label className="flex items-center justify-center">
                        <input
                          type="radio"
                          name="plan"
                          value="monthlyFamily"
                          checked={plan === "monthlyFamily"}
                          onChange={() => handlePlanChange("monthlyFamily")}
                          className="sr-only"
                        />
                        <div className={`
                          w-full py-2 px-4 rounded-md font-medium text-center transition-colors
                          ${plan === "monthlyFamily" 
                            ? "bg-amber-600 text-white" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }
                        `}>
                          {plan === "monthlyFamily" ? "Selected" : "Select Plan"}
                        </div>
                      </label>
                    </div>
                  </div>
                    {/* Card Back */}                  <div className="flip-card-back absolute w-full h-full backface-hidden bg-amber-600 text-white p-5 rounded-xl">
                    <div className="flex flex-col h-full">
                      {/* Close button at the top */}
                      <div className="flex-shrink-0 flex justify-end p-2">
                        <button 
                          type="button"
                          className="text-white hover:text-amber-100 focus:outline-none info-btn z-30 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/30 transition-all duration-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFlippedCard(null);
                          }}
                          aria-label="Close details"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                        {/* Description/content area */}
                      <div className="flex-grow flex flex-col justify-start px-4 py-2">
                        <h3 className="font-bold text-xl mb-4 mt-2">{PLAN_PRICING.monthlyFamily.name}</h3>
                        <p className="text-sm mb-6">{PLAN_PRICING.monthlyFamily.description}</p>
                      </div>
                      
                      {/* Button at the bottom - fixed positioning */}
                      <div className="mt-auto px-4 pb-4 flex-shrink-0">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlanChange("monthlyFamily");
                            setFlippedCard(null);
                          }} 
                          className="bg-white text-amber-600 py-2 px-4 rounded-md font-medium hover:bg-amber-50 transition-colors w-full"
                        >
                          {plan === "monthlyFamily" ? "Already Selected" : "Select This Plan"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Second Person Information - Only shown for Family Plan */}
          {plan === "monthlyFamily" && (
            <div className="mt-4 rounded-xl shadow-md border border-amber-200 overflow-hidden animate__animated animate__fadeIn">
              <div className="bg-gradient-to-r from-amber-50 to-amber-100 py-3 px-4 border-b border-amber-200">
                <p className="font-semibold text-gray-700 flex items-center">
                  <svg className="h-5 w-5 mr-2 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Second Person Details
                </p>
              </div>
              <div className="p-5 bg-white">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    name="secondFirstName"
                    placeholder="First name"
                    value={secondFirstName}
                    onChange={(e) => {
                      setSecondFirstName(e.target.value);
                      setFieldErrors({...fieldErrors, secondFirstName: ''});
                    }}
                    className={`w-full p-3 border ${fieldErrors.secondFirstName ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none bg-white text-gray-900 placeholder:text-gray-400 transition duration-200`}
                    required
                  />
                  {fieldErrors.secondFirstName && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.secondFirstName}</p>
                  )}
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    name="secondLastName"
                    placeholder="Last name"
                    value={secondLastName}
                    onChange={(e) => {
                      setSecondLastName(e.target.value);
                      setFieldErrors({...fieldErrors, secondLastName: ''});
                    }}
                    className={`w-full p-3 border ${fieldErrors.secondLastName ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none bg-white text-gray-900 placeholder:text-gray-400 transition duration-200`}
                    required
                  />
                  {fieldErrors.secondLastName && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.secondLastName}</p>
                  )}
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="secondEmail"
                    placeholder="email@example.com"
                    value={secondEmail}
                    onChange={(e) => {
                      handleInputChange(setSecondEmail, 'secondEmail', e.target.value);
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    onBlur={() => {
                      validateField('secondEmail', secondEmail, validationRules.secondEmail, email);
                      if (secondEmail && secondEmail.includes('@') && !fieldErrors.secondEmail && email && email.includes('@')) {
                        checkSubscriptionConflict();
                      }
                    }}
                    className={`w-full p-3 border ${fieldErrors.secondEmail ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none bg-white text-gray-900 placeholder:text-gray-400 transition duration-200`}
                    required
                  />
                  {fieldErrors.secondEmail && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.secondEmail}</p>
                  )}
                </div>
                
                <div className="mb-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="secondPhone"
                    placeholder="Enter 10-digit number"
                    value={secondPhone}
                    onChange={(e) => {
                      setSecondPhone(e.target.value);
                      setFieldErrors({...fieldErrors, secondPhone: ''});
                    }}
                    className={`w-full p-3 border ${fieldErrors.secondPhone ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none bg-white text-gray-900 placeholder:text-gray-400 transition duration-200`}
                    required
                  />
                  {fieldErrors.secondPhone && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.secondPhone}</p>
                  )}
                </div>
                
                <div className="flex items-start bg-amber-50 p-3 rounded-lg mt-3 text-sm">
                  <svg className="h-5 w-5 mr-2 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-amber-700">
                    Both participants will receive their own access to all sessions during the plan period. Each person must have a unique email address.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Date Selector Section */}
          <div className="mt-16 rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 py-3 px-4 border-b border-gray-200">
              <p className="font-semibold text-gray-700 flex items-center">
                <svg className="h-5 w-5 mr-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
                  />
                </svg>
                Select Start Date
              </p>
            </div>
            <div className="p-5 bg-white">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {plan === 'daily' 
                    ? 'Session Date (IST)' 
                    : `Plan Start Date (IST)`}
                  <span className="text-xs text-gray-500 ml-2">DD/MM/YYYY</span>
                </label>                <input
                  type="date"
                  name="startDate"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  min={new Date().toISOString().split('T')[0]} // Set min to current date
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none bg-white text-gray-900 transition duration-200 text-sm sm:text-base"
                  required
                />
                {startDate && (
                  <p className="text-xs text-gray-500 mt-1">
                    Selected: {formatDateDDMMYYYY(startDate)}
                  </p>
                )}
              </div>
              
              <div className="flex items-start bg-blue-50 p-3 rounded-lg text-sm">
                <svg className="h-5 w-5 mr-2 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-blue-700">
                  {plan === 'daily' ? (
                    <>Select the specific date for your single session. Access will be valid for this day only.</>
                  ) : (
                    <>Your {plan === 'monthlyFamily' ? 'family ' : ''}plan will start on the selected date and continue for 30 days. You'll have access to all sessions during this period.</>
                  )}
                </div>
              </div>
              
              {successMessage && (
                <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                  <p className="text-sm text-green-700 flex items-center">
                    <svg className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {successMessage}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Source (How did you hear about us) Section */}
          <div className="mt-6 rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 py-3 px-4 border-b border-gray-200">
              <p className="font-semibold text-gray-700 flex items-center">
                <svg className="h-5 w-5 mr-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
                How did you hear about us?
              </p>
            </div>
            <div className="p-5 bg-white">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select
                  name="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none bg-white text-gray-900 transition duration-200"
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
              
              {/* Reference field (shown only if source is "Reference") */}
              {source === "Reference" && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference Name</label>
                  <input
                    type="text"
                    name="reference"
                    placeholder="Enter reference name"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none bg-white text-gray-900 placeholder:text-gray-400 transition duration-200"
                    autoComplete="off"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Error or success message */}
          {(errorMessage || successMessage) && (
            <div className={`mt-6 p-4 rounded-xl shadow-md ${
              errorMessage 
                ? 'bg-red-50 border border-red-200' 
                : 'bg-green-50 border border-green-200'
            }`}>
              <p className={`flex items-start ${
                errorMessage ? 'text-red-700' : 'text-green-700'
              }`}>
                {errorMessage ? (
                  <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                    />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                <span>{errorMessage || successMessage}</span>
              </p>
            </div>
          )}

          {/* Submit button */}
          <div className="mt-6">
            <button
              type="submit"
              className={`w-full px-6 py-4 text-white font-medium rounded-xl shadow-lg focus:outline-none focus:ring-4 transition-all duration-300 ${
                isLoading 
                  ? 'bg-gray-500 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300'
              }`}
              disabled={isLoading}
            >              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  Register & Pay {PLAN_PRICING[plan].display}
                  <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              )}
            </button>
          </div>
            {/* Plan selection information */}
          <div className="flex items-start bg-blue-50 p-3 rounded-lg mt-3 text-sm">
            <svg className="h-5 w-5 mr-2 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-blue-700">
              {plan === 'daily' ? (
                <>Choose a single session to get started with GOALETE Club.</>
              ) : plan === 'monthly' ? (
                <>The monthly plan provides 30 days of continuous access to all GOALETE Club sessions.</>
              ) : (                <>Share your GOALETE Club journey with a family member or friend. Each person gets their own access to all sessions.</>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
