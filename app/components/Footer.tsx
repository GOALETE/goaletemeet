'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full py-4 border-t border-gray-200 bg-white">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          © Goalete {new Date().getFullYear()} All Rights Reserved
        </div>
        <div>
          <a 
            href="https://merchant.razorpay.com/policy/QaSJ3UdoWP18Gj/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            Terms and Conditions
          </a>
        </div>
      </div>
    </footer>
  );
}
