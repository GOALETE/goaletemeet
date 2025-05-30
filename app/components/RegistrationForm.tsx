"use client";
import { useState } from "react";

export default function RegistrationForm() {
  const [plan, setPlan] = useState<"single" | "monthly">("single");
  const [sessionDate, setSessionDate] = useState("");
  const [monthStart, setMonthStart] = useState("");
  const [source, setSource] = useState("Instagram");
  const [reference, setReference] = useState("");

  // handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ plan, sessionDate, monthStart, source, reference });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-md space-y-6"
    >
      <h2 className="text-2xl font-bold text-center">GOALETE CLUB</h2>
      <p className="text-gray-600 text-center">HOW TO ACHIEVE ANY GOAL IN LIFE</p>

      <div className="space-y-2">
        <input
          type="text"
          placeholder="First Name"
          className="w-full p-3 border rounded-lg"
          required
        />
        <input
          type="text"
          placeholder="Last Name"
          className="w-full p-3 border rounded-lg"
          required
        />
        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 border rounded-lg"
          required
        />
        <input
          type="tel"
          placeholder="Phone No."
          className="w-full p-3 border rounded-lg"
          required
        />
      </div>

      <div>
        <p className="font-semibold">Subscription Plan</p>
        <div className="mt-2 space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="plan"
              value="single"
              checked={plan === "single"}
              onChange={() => setPlan("single")}
              className="mr-2"
            />
            Single Session (Rs. 499)
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="plan"
              value="monthly"
              checked={plan === "monthly"}
              onChange={() => setPlan("monthly")}
              className="mr-2"
            />
            Monthly Plan (Rs. 4999)
          </label>
        </div>
      </div>

      {plan === "single" && (
        <div>
          <label className="block mb-1 font-medium">Session Date</label>
          <input
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className="w-full p-3 border rounded-lg"
            required
          />
        </div>
      )}

      {plan === "monthly" && (
        <div>
          <label className="block mb-1 font-medium">Start Date</label>
          <input
            type="date"
            value={monthStart}
            onChange={(e) => setMonthStart(e.target.value)}
            className="w-full p-3 border rounded-lg"
            required
          />
        </div>
      )}

      <div>
        <p className="font-semibold">How did you hear about us?</p>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="w-full p-3 border rounded-lg"
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
            className="w-full p-3 mt-2 border rounded-lg"
          />
        )}
      </div>

      <button
        type="submit"
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg"
      >
        Proceed to Payment
      </button>
    </form>
  );
}