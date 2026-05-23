import React from 'react';
import '../styles.css';

const WelcomeScreen = ({ onSelectFull, onSelectQuick }) => (
  <div className="welcome-screen">
    <p className="welcome-eyebrow">House of Finance</p>
    <h1 className="welcome-title">New Client Fact Find</h1>
    <p className="welcome-subtitle">
      Choose the right fact find for your situation. Both submit directly to Mercury and notify the team.
    </p>

    <div className="welcome-cards">

      {/* Full Fact Find */}
      <button className="welcome-card full" onClick={onSelectFull}>
        <div className="welcome-card-icon">📋</div>
        <div className="welcome-card-time">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          ~45 min
        </div>
        <h2 className="welcome-card-title">Full Fact Find</h2>
        <p className="welcome-card-desc">
          Complete loan application capturing all details required for full assessment and submission to lenders.
        </p>
        <ul className="welcome-card-bullets">
          <li>Loan strategy, securities &amp; structure</li>
          <li>All applicant details &amp; DL extraction</li>
          <li>Employment income &amp; payslip AI</li>
          <li>Assets, liabilities &amp; net position</li>
          <li>DocuSeal e-signature flow</li>
        </ul>
        <span className="welcome-card-btn">Start Full Fact Find →</span>
      </button>

      {/* Quick Fact Find */}
      <button className="welcome-card quick" onClick={onSelectQuick}>
        <div className="welcome-card-icon">⚡</div>
        <div className="welcome-card-time">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          ~5 min
        </div>
        <h2 className="welcome-card-title">Quick Fact Find</h2>
        <p className="welcome-card-desc">
          Fast lead capture for time-poor brokers. Capture essentials now — back office completes the rest. Perfect for early-stage enquiries or existing clients.
        </p>
        <ul className="welcome-card-bullets">
          <li>Applicant contact details</li>
          <li>Loan purpose &amp; estimated amount</li>
          <li>Property suburb</li>
          <li>Submits to Mercury &amp; notifies back office</li>
        </ul>
        <span className="welcome-card-btn">Start Quick Fact Find →</span>
      </button>

    </div>
  </div>
);

export default WelcomeScreen;
