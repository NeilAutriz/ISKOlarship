// ============================================================================
// ISKOlarship - Footer Component
// ============================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Mail, 
  MapPin, 
  Phone,
  Facebook,
  ExternalLink
} from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-white">
      {/* Main Footer Content */}
      <div className="container-app py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-uplb-600 to-uplb-800 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-display font-bold">
                  ISKO<span className="text-gold-400">larship</span>
                </span>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              A web-based scholarship discovery platform using rule-based filtering 
              and logistic regression to help UPLB students find scholarships they 
              qualify for.
            </p>
            <div className="flex gap-3">
              <a 
                href="https://www.facebook.com/UPLBOfficial" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-uplb-800 flex items-center justify-center transition-colors"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4">
              Quick Links
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-slate-400 hover:text-white transition-colors text-sm">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/scholarships" className="text-slate-400 hover:text-white transition-colors text-sm">
                  Browse Scholarships
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors text-sm">
                  Student Dashboard
                </Link>
              </li>
              <li>
                <Link to="/analytics" className="text-slate-400 hover:text-white transition-colors text-sm">
                  Analytics
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4">
              Resources
            </h4>
            <ul className="space-y-3">
              <li>
                <a 
                  href="https://osg.uplb.edu.ph" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white transition-colors text-sm inline-flex items-center gap-1"
                >
                  UPLB OSG Website
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a 
                  href="https://uplb.edu.ph" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white transition-colors text-sm inline-flex items-center gap-1"
                >
                  UPLB Official Website
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a 
                  href="https://ched.gov.ph" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white transition-colors text-sm inline-flex items-center gap-1"
                >
                  CHED Scholarships
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <Link to="/faq" className="text-slate-400 hover:text-white transition-colors text-sm">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4">
              Contact
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate-400">
                <MapPin className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />
                <span>
                  Office of Scholarships and Grants (OSG)<br />
                  University of the Philippines Los Baños<br />
                  College, Laguna 4031
                </span>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-400">
                <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span>(049) 536-2310</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-400">
                <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <a href="mailto:osg.uplb@up.edu.ph" className="hover:text-white transition-colors">
                  osg.uplb@up.edu.ph
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="container-app py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              © {currentYear} ISKOlarship. A CMSC 190 Special Problem Project.
            </p>
            <p className="text-sm text-slate-500">
              Developed by Mark Neil G. Autriz & Juan Miguel Bawagan
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;