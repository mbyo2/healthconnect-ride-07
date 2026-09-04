import React, { useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  Ticket,
  UserCheck,
  CreditCard,
  Phone,
  Search,
  CheckCircle2,
  Printer,
  Home,
  Baby,
  Activity,
  Pill,
  HeartPulse,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

type KioskMode = "menu" | "checkin" | "register" | "pay" | "success";

export const SelfServiceKiosk: React.FC = () => {
  const [mode, setMode] = useState<KioskMode>("menu");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [patientData, setPatientData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    gender: "female",
    department: "General OPD",
    symptoms: "",
  });
  const [generatedToken, setGeneratedToken] = useState({
    number: "OPD-108",
    patient: "Walk-in Patient",
    dept: "General OPD",
    room: "Room 102",
    time: "09:00 AM",
  });

  // Payment state
  const [billAmount, setBillAmount] = useState(150.0);
  const [payMethod, setPayMethod] = useState<"mtn" | "airtel" | "card">("mtn");
  const [payPhone, setPayPhone] = useState("");
  const [isProcessingPay, setIsProcessingPay] = useState(false);

  const handleLookupCheckin = () => {
    if (!phoneSearch) {
      toast.error("Please enter your phone number or National ID");
      return;
    }
    const tokenNo = `OPD-${Math.floor(100 + Math.random() * 900)}`;
    setGeneratedToken({
      number: tokenNo,
      patient: "Returning Patient",
      dept: "General OPD",
      room: "Room 104",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
    setMode("success");
    toast.success(`Check-in complete! Token #${tokenNo} issued.`);
  };

  const handleSelfRegister = () => {
    if (!patientData.firstName || !patientData.phone) {
      toast.error("Please enter your name and phone number");
      return;
    }
    const prefix = patientData.department.includes("Pediatric") ? "PED" : patientData.department.includes("Physio") ? "PT" : "OPD";
    const tokenNo = `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
    setGeneratedToken({
      number: tokenNo,
      patient: `${patientData.firstName} ${patientData.lastName}`,
      dept: patientData.department,
      room: "Triage Station 1",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
    setMode("success");
    toast.success(`Registration successful! Token #${tokenNo} printed.`);
  };

  const handleProcessPayment = () => {
    if (!payPhone && (payMethod === "mtn" || payMethod === "airtel")) {
      toast.error("Enter your Mobile Money mobile number");
      return;
    }
    setIsProcessingPay(true);
    setTimeout(() => {
      setIsProcessingPay(false);
      toast.success(`Payment of K${billAmount.toFixed(2)} approved! Receipt generated.`);
      setMode("success");
    }, 2000);
  };

  const handlePrintSlip = () => {
    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.write(`
        <html>
          <body style="font-family: monospace; text-align: center; max-width: 260px; margin: auto; padding: 15px;">
            <h2 style="margin: 0; font-size: 16px;">DOC' O CLOCK HEALTH</h2>
            <p style="margin: 2px 0 10px 0; font-size: 10px;">Self-Service Check-In Kiosk</p>
            <hr style="border-top: 1px dashed #000; margin: 10px 0;"/>
            <div style="font-size: 32px; font-weight: bold; margin: 10px 0;">${generatedToken.number}</div>
            <div style="font-size: 12px; font-weight: bold;">${generatedToken.dept}</div>
            <div style="font-size: 11px; margin-top: 4px;">Proceed to: <strong>${generatedToken.room}</strong></div>
            <hr style="border-top: 1px dashed #000; margin: 10px 0;"/>
            <div style="font-size: 10px; text-align: left;">
              <div>Patient: ${generatedToken.patient}</div>
              <div>Issued: ${generatedToken.time}</div>
            </div>
            <p style="font-size: 9px; margin-top: 15px;">Please watch the Waiting Room TV display for your token number.</p>
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWin.document.close();
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans p-6 sm:p-10 flex flex-col justify-between">
      {/* Top Kiosk Header */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between border-b border-[#e6e9ef] dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-[#0073ea] text-white flex items-center justify-center font-black text-xl shadow-sm shadow-[#0073ea]/30">
            <Ticket className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Doc' O Clock Patient Self-Service Kiosk
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Touchscreen Check-In, Walk-in Triage &amp; Mobile Money Billing
            </p>
          </div>
        </div>

        {mode !== "menu" && (
          <button
            onClick={() => setMode("menu")}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-[#c3c6d4] dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-black flex items-center gap-1.5 shadow-xs hover:bg-[#f0f2f7]"
          >
            <Home className="h-4 w-4" /> Home Screen
          </button>
        )}
      </div>

      {/* Main Kiosk Content Area */}
      <div className="max-w-4xl mx-auto w-full my-auto py-8">
        {/* 1. Main Selection Menu */}
        {mode === "menu" && (
          <div className="space-y-6 text-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
                Welcome! Please Select a Service
              </h2>
              <p className="text-sm text-slate-500 mt-1 font-medium">
                Tap an option below on this touchscreen terminal
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
              {/* Option 1: Check-in */}
              <button
                onClick={() => setMode("checkin")}
                className="p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#e6e9ef] dark:border-slate-800 hover:border-[#0073ea] shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between group active:scale-95"
              >
                <div className="h-14 w-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#0073ea] flex items-center justify-center font-black mb-6 group-hover:bg-[#0073ea] group-hover:text-white transition-colors">
                  <UserCheck className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-slate-100">
                    Existing Appointment Check-In
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Have an appointment today? Enter your phone number to print your queue token.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-1 text-xs font-black text-[#0073ea]">
                  <span>Touch to Start</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </button>

              {/* Option 2: Walk-in Registration */}
              <button
                onClick={() => setMode("register")}
                className="p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#e6e9ef] dark:border-slate-800 hover:border-emerald-500 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between group active:scale-95"
              >
                <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center font-black mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <HeartPulse className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-slate-100">
                    New Walk-In Patient Registration
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    No appointment? Register your details and symptoms for instant triage routing.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-1 text-xs font-black text-emerald-600">
                  <span>Touch to Start</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </button>

              {/* Option 3: Bill Payment */}
              <button
                onClick={() => setMode("pay")}
                className="p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#e6e9ef] dark:border-slate-800 hover:border-purple-500 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between group active:scale-95"
              >
                <div className="h-14 w-14 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center font-black mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <CreditCard className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-slate-100">
                    Pay Bill / Mobile Money
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Pay for pharmacy medications, lab tests, or consultations via MTN, Airtel, or Card.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-1 text-xs font-black text-purple-600">
                  <span>Touch to Start</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 2. Check-in by Phone / ID */}
        {mode === "checkin" && (
          <div className="max-w-md mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-md space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Patient Appointment Lookup</h2>
              <p className="text-xs text-slate-500 mt-1">Enter your registered mobile phone number</p>
            </div>

            <div>
              <label className="font-bold text-xs text-slate-700 dark:text-slate-300">Mobile Phone Number</label>
              <input
                type="tel"
                className="w-full mt-2 px-4 py-3 rounded-2xl border-2 border-[#c3c6d4] text-lg font-black text-center tracking-widest focus:border-[#0073ea] focus:outline-none"
                placeholder="+260 97X XXX XXX"
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
              />
            </div>

            <button
              onClick={handleLookupCheckin}
              className="w-full py-3.5 rounded-2xl bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-sm shadow-sm active:scale-95 transition-all"
            >
              Verify &amp; Print Token Slip
            </button>
          </div>
        )}

        {/* 3. Walk-in Registration */}
        {mode === "register" && (
          <div className="max-w-lg mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-md space-y-4 text-xs">
            <div className="text-center pb-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Quick Walk-In Registration</h2>
              <p className="text-xs text-slate-500 mt-1">Fill in basic details for immediate triage and consultation</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">First Name *</label>
                <input
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                  value={patientData.firstName}
                  onChange={(e) => setPatientData({ ...patientData, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="font-bold">Last Name</label>
                <input
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                  value={patientData.lastName}
                  onChange={(e) => setPatientData({ ...patientData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">Mobile Phone *</label>
                <input
                  type="tel"
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                  placeholder="+260 97..."
                  value={patientData.phone}
                  onChange={(e) => setPatientData({ ...patientData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="font-bold">Target Department</label>
                <select
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-bold bg-white dark:bg-slate-950"
                  value={patientData.department}
                  onChange={(e) => setPatientData({ ...patientData, department: e.target.value })}
                >
                  <option value="General OPD">General OPD</option>
                  <option value="Pediatrics Center">Pediatrics (Child Health)</option>
                  <option value="Physiotherapy Center">Physiotherapy &amp; Rehab</option>
                  <option value="Community Dispensary">Dispensary / Pharmacy</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold">Chief Symptoms / Reason for Visit</label>
              <textarea
                rows={2}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                placeholder="e.g. Fever, cough, shoulder pain, routine checkup..."
                value={patientData.symptoms}
                onChange={(e) => setPatientData({ ...patientData, symptoms: e.target.value })}
              />
            </div>

            <button
              onClick={handleSelfRegister}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-sm active:scale-95 transition-all mt-2"
            >
              Complete Registration &amp; Get Token
            </button>
          </div>
        )}

        {/* 4. Payment Screen */}
        {mode === "pay" && (
          <div className="max-w-md mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-md space-y-5 text-xs">
            <div className="text-center">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Kiosk Express Payment</h2>
              <p className="text-xs text-slate-500 mt-1">Pay for pharmacy, lab, or consultation</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-[#e6e9ef] flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Bill Outstanding</span>
                <div className="text-2xl font-black text-emerald-600 mt-0.5">K{billAmount.toFixed(2)}</div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                Active Invoice
              </span>
            </div>

            <div>
              <label className="font-bold">Select Payment Provider</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setPayMethod("mtn")}
                  className={`p-3 rounded-2xl border-2 font-bold text-center transition-all ${
                    payMethod === "mtn" ? "border-amber-400 bg-amber-50 dark:bg-amber-950/40 font-black" : "border-[#e6e9ef]"
                  }`}
                >
                  🟡 MTN MoMo
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod("airtel")}
                  className={`p-3 rounded-2xl border-2 font-bold text-center transition-all ${
                    payMethod === "airtel" ? "border-rose-400 bg-rose-50 dark:bg-rose-950/40 font-black" : "border-[#e6e9ef]"
                  }`}
                >
                  🔴 Airtel Money
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod("card")}
                  className={`p-3 rounded-2xl border-2 font-bold text-center transition-all ${
                    payMethod === "card" ? "border-[#0073ea] bg-blue-50 dark:bg-blue-950/40 font-black" : "border-[#e6e9ef]"
                  }`}
                >
                  💳 Card POS
                </button>
              </div>
            </div>

            {payMethod !== "card" && (
              <div>
                <label className="font-bold">Mobile Money Number</label>
                <input
                  type="tel"
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-[#c3c6d4] text-center font-black"
                  placeholder="097X XXX XXX"
                  value={payPhone}
                  onChange={(e) => setPayPhone(e.target.value)}
                />
              </div>
            )}

            <button
              onClick={handleProcessPayment}
              disabled={isProcessingPay}
              className="w-full py-3.5 rounded-2xl bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-sm shadow-sm active:scale-95 transition-all disabled:opacity-50"
            >
              {isProcessingPay ? "Authorizing Payment Prompt on Phone..." : `Authorize Payment (K${billAmount.toFixed(2)})`}
            </button>
          </div>
        )}

        {/* 5. Success / Token Printed Screen */}
        {mode === "success" && (
          <div className="max-w-md mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-500 shadow-xl text-center space-y-6">
            <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-black mx-auto">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <div>
              <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Your Queue Token Number</span>
              <div className="text-6xl font-black font-mono text-[#0073ea] mt-2">
                {generatedToken.number}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-[#e6e9ef] text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Department:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{generatedToken.dept}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Please Proceed To:</span>
                <span className="font-bold text-emerald-600">{generatedToken.room}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimated Waiting:</span>
                <span className="font-bold">Approx. 8 - 12 mins</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={handlePrintSlip}
                className="w-full py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs"
              >
                <Printer className="h-4 w-4" /> Print Token Paper Slip
              </button>

              <button
                onClick={() => setMode("menu")}
                className="w-full py-2.5 rounded-2xl text-slate-500 hover:text-slate-700 font-bold text-xs"
              >
                Finished (Return to Home Screen)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Kiosk Footer */}
      <div className="max-w-4xl mx-auto w-full text-center text-xs text-slate-400 font-medium">
        Doc' O Clock Digital Health Network • Kiosk Terminal #K-01 Lusaka
      </div>
    </div>
  );
};

export default SelfServiceKiosk;
