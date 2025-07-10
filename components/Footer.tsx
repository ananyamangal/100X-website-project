import Link from 'next/link';
import { Facebook, Twitter, Instagram, Linkedin, Youtube } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-16 mt-24">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <img src="/logo-main.png" alt="100X Logo" className="w-24 h-auto" />
              <div>
                <h3 className="text-xl font-bold">100X</h3>
                <p className="text-green-400 text-sm">Certified professional products</p>
              </div>
            </div>
            <p className="text-gray-400 mb-6">
              Leading manufacturer of premium products across India.
            </p>
            {/* Social Media Links */}
            <div className="flex space-x-4">
              <a href="https://facebook.com/100x" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer">
                <Facebook size={20} />
              </a>
              <a href="https://twitter.com/100x" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-400 transition-colors cursor-pointer">
                <Twitter size={20} />
              </a>
              <a href="https://instagram.com/100x" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors cursor-pointer">
                <Instagram size={20} />
              </a>
              <a href="https://linkedin.com/company/100x" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors cursor-pointer">
                <Linkedin size={20} />
              </a>
              <a href="https://youtube.com/100x" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer">
                <Youtube size={20} />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-6 text-lg">Products</h4>
            <ul className="space-y-3 text-gray-400">
              <li><Link href="/products" className="hover:text-green-400 transition-colors">All Products</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-6 text-lg">Quick Links</h4>
            <ul className="space-y-3 text-gray-400">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Home</Link></li>
              <li><Link href="/products" className="hover:text-green-400 transition-colors">Products</Link></li>
              <li><Link href="/about" className="hover:text-green-400 transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-green-400 transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-6 text-lg">Contact</h4>
            <ul className="space-y-3 text-gray-400">
              <li>Email: 100xcircle@gmail.com</li>
              <li>Phone: +91 7827229116</li>
              <li>Location: Sector 7, IMT Manesar, Gurgaon</li>
            </ul>
          </div>
        </div>
        <div className="text-center text-gray-500 text-sm border-t border-gray-800 pt-8">
          &copy; {new Date().getFullYear()} 100X Circle Pvt Ltd. All rights reserved.
        </div>
      </div>
    </footer>
  );
} 