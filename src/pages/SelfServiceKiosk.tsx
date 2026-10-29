import { safeDocumentWrite } from "@/utils/safePrint";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router-dom";
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
  Smartphone,
  Loader2,
  Building2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useInstitutionAffiliation } from "@/hooks/useInstitutionAffiliation";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { findOrCreatePatient } from "@/lib/patients";
import {
  getKioskTerminalInfo,
  isCompletePhone,
  kioskCheckIn,
  lookupKioskPatient,
  type KioskPatientMatch,
} from "@/lib/kiosk";

type KioskMode = "menu" | "checkin" | "register" | "pay" | "success";
type TerminalState = "loading" | "ready" | "inactive";
type LookupState = "idle" | "searching" | "notfound" | "found";

export const SelfServiceKiosk: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { institutionId: affiliatedInstitutionId, loading: affiliationLoading } =
    useInstitutionAffiliation();

  // The terminal belongs to ONE hospital: the dashboard launches it with
  // ?institution=<id> (same pattern as the public TV display); a signed-in
  // staff member opening /kiosk directly falls back to their institution.
  const institutionId =
    searchParams.get("institution") || affiliatedInstitutionId || null;

  const [terminalState, setTerminalState] = useState<TerminalState>("loading");
  const [institutionName, setInstitutionName] = useState("");

  useEffect(() => {
    if (!institutionId) {
      if (!authLoading && !affiliationLoading) setTerminalState("inactive");
      return;
    }
    let cancelled = false;
    getKioskTerminalInfo(institutionId)
      .then((info) => {
        if (cancelled) return;
        setInstitutionName(info.institutionName);
        setTerminalState(info.canOperate ? "ready" : "inactive");
      })
      .catch(() => {
        if (!cancelled) setTerminalState("inactive");
      });
    return () => {
      cancelled = true;
    };
  }, [institutionId, user, authLoading, affiliationLoading]);

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
    number: "",
    patient: "",
    dept: "General OPD",
    time: "",
    alreadyCheckedIn: false,
  });

  // Check-in lookup state — the patient is found in THIS hospital's
  // records by the exact phone number they type (kiosk_lookup_patient).
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [matches, setMatches] = useState<KioskPatientMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<KioskPatientMatch | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Payment state — amount is entered from the patient's paper invoice;
  // the kiosk never invents a bill total.
  const [billAmount, setBillAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<"mtn" | "airtel" | "card">("mtn");
  const [payPhone, setPayPhone] = useState("");
  const [isProcessingPay, setIsProcessingPay] = useState(false);

  const goMode = (next: KioskMode) => {
    setMode(next);
    if (next === "checkin") {
      setLookupState("idle");
      setMatches([]);
      setSelectedMatch(null);
    }
  };

  const handleLookupCheckin = async () => {
    if (!institutionId) return;
    if (!isCompletePhone(phoneSearch)) {
      toast.error("Please enter the full phone number used when you registered");
      return;
    }
    setLookupState("searching");
    setMatches([]);
    setSelectedMatch(null);
    try {
      const found = await lookupKioskPatient(institutionId, phoneSearch);
      setMatches(found);
      if (found.length === 0) {
        setLookupState("notfound");
      } else {
        setLookupState("found");
        if (found.length === 1) setSelectedMatch(found[0]);
      }
    } catch (e) {
      setLookupState("idle");
      toast.error(
        friendlyErrorMessage(e, "We could not search the patient records. Please ask at reception."),
      );
    }
  };

  const handleConfirmCheckin = async (match: KioskPatientMatch) => {
    if (!institutionId || isCheckingIn) return;
    setIsCheckingIn(true);
    try {
      const result = await kioskCheckIn(
        institutionId,
        match.patientId,
        "General OPD",
        JSON.stringify({ source: "kiosk_checkin" }),
      );
      setGeneratedToken({
        number: result.tokenNumber,
        patient: result.patientName,
        dept: result.department,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        alreadyCheckedIn: result.alreadyCheckedIn,
      });
      setMode("success");
      toast.success(
        result.alreadyCheckedIn
          ? `You are already checked in — token ${result.tokenNumber}.`
          : `Check-in complete! Token ${result.tokenNumber} issued.`,
      );
    } catch (e) {
      toast.error(
        friendlyErrorMessage(e, "Check-in could not be completed. Please ask at reception."),
      );
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleSelfRegister = async () => {
    if (!institutionId || isRegistering) return;
    if (!patientData.firstName || !patientData.phone) {
      toast.error("Please enter your name and phone number");
      return;
    }
    if (!isCompletePhone(patientData.phone)) {
      toast.error("Please enter the full phone number — the hospital uses it to find your record");
      return;
    }
    setIsRegistering(true);
    try {
      // One patient master: find-or-create dedupes on the phone number,
      // so registering here never creates a second record for a patient
      // the front desk already knows — and a new record lands on the
      // hospital roster, visible to the queue, triage and every module.
      const resolved = await findOrCreatePatient(
        institutionId,
        {
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          phone: patientData.phone,
          gender: patientData.gender,
        },
        "walk_in",
      );
      const result = await kioskCheckIn(
        institutionId,
        resolved.patientId,
        patientData.department,
        JSON.stringify({
          symptoms: patientData.symptoms || undefined,
          source: "kiosk_self_registration",
        }),
      );
      setGeneratedToken({
        number: result.tokenNumber,
        patient: result.patientName,
        dept: result.department,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        alreadyCheckedIn: result.alreadyCheckedIn,
      });
      setMode("success");
      toast.success(
        resolved.created
          ? `Registration successful! Token ${result.tokenNumber} issued.`
          : `Welcome back! Token ${result.tokenNumber} issued.`,
      );
    } catch (e) {
      toast.error(
        friendlyErrorMessage(e, "Registration could not be completed. Please ask at reception."),
      );
    } finally {
      setIsRegistering(false);
    }
  };

  const [billRef, setBillRef] = useState<string | null>(null);

  // Honest kiosk billing: the kiosk is an unattended display — it cannot
  // move money. It issues a payable bill slip (reference + amount) that the
  // patient settles at the counter (cash / card / MoMo POS) or in the app.
  // No fake "approved" state is ever shown.
  const handleProcessPayment = () => {
    if (!(billAmount > 0)) {
      toast.error("Enter the amount shown on your hospital invoice");
      return;
    }
    if (!payPhone && (payMethod === "mtn" || payMethod === "airtel")) {
      toast.error("Enter your Mobile Money mobile number");
      return;
    }
    setIsProcessingPay(true);
    const ref = `KB-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    setTimeout(() => {
      setIsProcessingPay(false);
      setBillRef(ref);
      toast.info("Bill slip ready — pay at the counter or in the app.");
    }, 800);
  };

  const handlePrintBill = () => {
    const printWin = window.open("", "_blank");
    if (printWin) {
      safeDocumentWrite(printWin, `
        <html>
          <body style="font-family: monospace; text-align: center; max-width: 260px; margin: auto; padding: 15px;">
            <h2 style="margin: 0; font-size: 16px;">DOC' O CLOCK HEALTH</h2>
            <p style="margin: 2px 0 10px 0; font-size: 10px;">Kiosk Bill Slip (NOT A RECEIPT)</p>
            <hr style="border-top: 1px dashed #000; margin: 10px 0;"/>
            <div style="font-size: 13px; font-weight: bold;">Bill Ref: ${billRef || ''}</div>
            <div style="font-size: 28px; font-weight: bold; margin: 10px 0;">K${billAmount.toFixed(2)}</div>
            <div style="font-size: 11px;">Method: ${payMethod === "card" ? "Card POS (at counter)" : payMethod === "mtn" ? "MTN MoMo" : "Airtel Money"}${payPhone ? ` (${payPhone})` : ''}</div>
            <hr style="border-top: 1px dashed #000; margin: 10px 0;"/>
            <p style="font-size: 9px;">Pay at the billing counter or in the Doc' O Clock app using this reference. Keep this slip.</p>
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWin.document.close();
    }
  };

  const handlePrintSlip = () => {
    const printWin = window.open("", "_blank");
    if (printWin) {
      safeDocumentWrite(printWin, `
        <html>
          <body style="font-family: monospace; text-align: center; max-width: 260px; margin: auto; padding: 15px;">
            <h2 style="margin: 0; font-size: 16px;">DOC' O CLOCK HEALTH</h2>
            <p style="margin: 2px 0 10px 0; font-size: 10px;">Self-Service Check-In Kiosk</p>
            <hr style="border-top: 1px dashed #000; margin: 10px 0;"/>
            <div style="font-size: 32px; font-weight: bold; margin: 10px 0;">${generatedToken.number}</div>
            <div style="font-size: 12px; font-weight: bold;">${generatedToken.dept}</div>
            <div style="font-size: 11px; margin-top: 4px;">Proceed to: <strong>Waiting Area</strong></div>
            <hr style="border-top: 1px dashed #000; margin: 10px 0;"/>
            <div style="font-size: 10px; text-align: left;">
              <div>Patient: ${generatedToken.patient}</div>
              <div>Issued: ${generatedToken.time}</div>
            </div>
            <p style="font-size: 9px; margin-top: 15px;">Watch the waiting-room display for your token number.</p>
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWin.document.close();
    }
  };

  return (
    <div className="min-h-screen bg-canvas-bone dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans p-6 sm:p-10 flex flex-col justify-between">
      {/* Top Kiosk Header */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between border-b border-canvas-silk dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary-500 text-white flex items-center justify-center font-bold text-xl shadow-sm shadow-primary-500/30">
            <Ticket className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Doc' O Clock Patient Self-Service Kiosk
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-300 font-medium">
              {institutionName ? `${institutionName} • ` : ""}Touchscreen Check-In, Walk-in Triage &amp; Mobile Money Billing
            </p>
          </div>
        </div>

        {mode !== "menu" && terminalState === "ready" && (
          <button
            onClick={() => goMode("menu")}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-graphite-300 dark:border-slate-700 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-xs hover:bg-canvas-mist dark:hover:bg-slate-800"
          >
            <Home className="h-4 w-4" /> Home Screen
          </button>
        )}
      </div>

      {/* Main Kiosk Content Area */}
      <div className="max-w-4xl mx-auto w-full my-auto py-8">
        {/* 0. Terminal activation states — patient functions only run when
            this terminal is authorised for one hospital (staff session). */}
        {terminalState === "loading" && (
          <div className="max-w-md mx-auto p-8 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-md text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Starting kiosk…</p>
          </div>
        )}

        {terminalState === "inactive" && (
          <div className="max-w-md mx-auto p-8 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-md text-center space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto">
              <Building2 className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">This kiosk is not active yet</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-300 font-medium">
              {institutionName
                ? `This terminal is not authorised for ${institutionName}. `
                : "This terminal has not been linked to a hospital. "}
              A staff member must sign in and open the kiosk from the hospital dashboard.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-300 font-medium">
              If you are a patient, please go to the reception desk — they will check you in.
            </p>
          </div>
        )}

        {terminalState === "ready" && (<>
        {/* 1. Main Selection Menu */}
        {mode === "menu" && (
          <div className="space-y-6 text-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                Welcome! Please Select a Service
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-300 mt-1 font-medium">
                Tap an option below on this touchscreen terminal
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
              {/* Option 1: Check-in */}
              <button
                onClick={() => goMode("checkin")}
                className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 hover:border-primary-500 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between group active:scale-95"
              >
                <div className="h-14 w-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-primary-500 flex items-center justify-center font-bold mb-6 group-hover:bg-primary-500 group-hover:text-white transition-colors">
                  <UserCheck className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                    Existing Appointment Check-In
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-300 mt-1 font-medium">
                    Have an appointment today? Enter your phone number to print your queue token.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-1 text-xs font-bold text-primary-500">
                  <span>Touch to Start</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </button>

              {/* Option 2: Walk-in Registration */}
              <button
                onClick={() => goMode("register")}
                className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 hover:border-emerald-500 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between group active:scale-95"
              >
                <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center font-bold mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <HeartPulse className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                    New Walk-In Patient Registration
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-300 mt-1 font-medium">
                    No appointment? Register your details and symptoms for instant triage routing.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <span>Touch to Start</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </button>

              {/* Option 3: Bill Payment */}
              <button
                onClick={() => goMode("pay")}
                className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 hover:border-purple-500 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between group active:scale-95"
              >
                <div className="h-14 w-14 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center font-bold mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <CreditCard className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                    Bill Slip / Pay Bill
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-300 mt-1 font-medium">
                    Get a payable bill slip for pharmacy, lab, or consultations — settle at the counter or in the app.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-1 text-xs font-bold text-purple-500">
                  <span>Touch to Start</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 2. Check-in by Phone — a real lookup against this hospital's
            patient records (exact phone match only, never a browse list). */}
        {mode === "checkin" && (
          <div className="max-w-md mx-auto p-8 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-md space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Patient Appointment Lookup</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-300 mt-1">Enter your registered mobile phone number</p>
            </div>

            <div>
              <label className="font-bold text-xs text-slate-700 dark:text-slate-300">Mobile Phone Number</label>
              <input
                type="tel"
                className="w-full mt-2 px-4 py-3 rounded-2xl border border-graphite-300 dark:border-slate-700 text-lg font-bold text-center tracking-widest focus:border-primary-500 focus:outline-none"
                placeholder="+260 97X XXX XXX"
                value={phoneSearch}
                onChange={(e) => {
                  setPhoneSearch(e.target.value);
                  setLookupState("idle");
                  setMatches([]);
                  setSelectedMatch(null);
                }}
              />
            </div>

            <button
              onClick={handleLookupCheckin}
              disabled={lookupState === "searching"}
              className="w-full py-3.5 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm shadow-sm active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {lookupState === "searching" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Searching…</>
              ) : (
                <><Search className="h-4 w-4" /> Find My Record</>
              )}
            </button>

            {lookupState === "notfound" && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-3 text-center">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  We could not find a patient record with that number
                  {institutionName ? ` at ${institutionName}` : ""}.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-300 font-medium">
                  If this is your first visit, register as a walk-in — it takes a minute. Otherwise please ask at reception.
                </p>
                <button
                  onClick={() => {
                    setPatientData((p) => ({ ...p, phone: phoneSearch }));
                    goMode("register");
                  }}
                  className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                >
                  Register as Walk-In
                </button>
              </div>
            )}

            {lookupState === "found" && matches.length > 1 && !selectedMatch && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-center text-slate-700 dark:text-slate-200">
                  More than one record uses this number — tap your name:
                </p>
                {matches.map((m) => (
                  <button
                    key={m.patientId}
                    onClick={() => setSelectedMatch(m)}
                    className="w-full py-3 rounded-2xl border border-graphite-300 dark:border-slate-700 font-bold text-sm hover:border-primary-500"
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            )}

            {lookupState === "found" && selectedMatch && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-canvas-silk space-y-3 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-300 font-medium">Is this you?</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedMatch.name}</p>
                {selectedMatch.hasAppointmentToday && (
                  <p className="text-xs font-bold text-primary-500">You have an appointment today</p>
                )}
                {selectedMatch.activeTokenNumber ? (
                  <p className="text-xs font-bold text-emerald-600">
                    You are already checked in — token {selectedMatch.activeTokenNumber}
                  </p>
                ) : null}
                <button
                  onClick={() => handleConfirmCheckin(selectedMatch)}
                  disabled={isCheckingIn}
                  className="w-full py-3 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCheckingIn ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Checking in…</>
                  ) : selectedMatch.activeTokenNumber ? (
                    <><Printer className="h-4 w-4" /> Show My Token</>
                  ) : (
                    <><UserCheck className="h-4 w-4" /> Yes — Check Me In</>
                  )}
                </button>
                <button
                  onClick={() => {
                    setSelectedMatch(null);
                    if (matches.length === 1) {
                      setLookupState("idle");
                      setMatches([]);
                    }
                  }}
                  className="w-full py-2 rounded-2xl text-slate-500 dark:text-slate-400 dark:text-slate-300 font-bold text-xs"
                >
                  Not me
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3. Walk-in Registration — saved to the one patient master via
            find-or-create, then checked into the real queue. */}
        {mode === "register" && (
          <div className="max-w-lg mx-auto p-8 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-md space-y-4 text-xs">
            <div className="text-center pb-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Quick Walk-In Registration</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-300 mt-1">Fill in basic details for immediate triage and consultation</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">First Name *</label>
                <input
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700"
                  value={patientData.firstName}
                  onChange={(e) => setPatientData({ ...patientData, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="font-bold">Last Name</label>
                <input
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700"
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
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700"
                  placeholder="+260 97..."
                  value={patientData.phone}
                  onChange={(e) => setPatientData({ ...patientData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="font-bold">Target Department</label>
                <select
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700 font-bold bg-white dark:bg-slate-950"
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
                className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700"
                placeholder="e.g. Fever, cough, shoulder pain, routine checkup..."
                value={patientData.symptoms}
                onChange={(e) => setPatientData({ ...patientData, symptoms: e.target.value })}
              />
            </div>

            <button
              onClick={handleSelfRegister}
              disabled={isRegistering}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm active:scale-95 transition-all mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isRegistering ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Registering…</>
              ) : (
                "Complete Registration & Get Token"
              )}
            </button>
          </div>
        )}

        {/* 4. Payment Screen */}
        {mode === "pay" && (
          <div className="max-w-md mx-auto p-8 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-md space-y-5 text-xs">
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Kiosk Bill Slip</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-300 mt-1">Pharmacy, lab, or consultation — pay at the counter or in the app</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-canvas-silk space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-300 uppercase">Amount From Your Invoice (K)</span>
                <span className="px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs">
                  Payable Slip
                </span>
              </div>
              <input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                aria-label="Bill amount in Kwacha from your hospital invoice"
                className="w-full px-4 py-3 rounded-2xl border border-graphite-300 dark:border-slate-700 text-2xl font-bold text-emerald-600 text-center focus:border-primary-500 focus:outline-none"
                placeholder="0.00"
                value={billAmount || ''}
                onChange={(e) => setBillAmount(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>

            <div>
              <label className="font-bold">Select Payment Provider</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <button
                  type="button"
                  aria-pressed={payMethod === "mtn"}
                  onClick={() => setPayMethod("mtn")}
                  className={`p-3 rounded-2xl border font-bold text-center transition-all flex flex-col items-center gap-1 ${
                    payMethod === "mtn" ? "border-amber-400 bg-amber-50 dark:bg-amber-950/40 font-bold" : "border-canvas-silk dark:border-slate-800"
                  }`}
                >
                  <Smartphone className="h-5 w-5 text-amber-500" aria-hidden /> MTN MoMo
                </button>
                <button
                  type="button"
                  aria-pressed={payMethod === "airtel"}
                  onClick={() => setPayMethod("airtel")}
                  className={`p-3 rounded-2xl border font-bold text-center transition-all flex flex-col items-center gap-1 ${
                    payMethod === "airtel" ? "border-rose-400 bg-rose-50 dark:bg-rose-950/40 font-bold" : "border-canvas-silk dark:border-slate-800"
                  }`}
                >
                  <Smartphone className="h-5 w-5 text-rose-500" aria-hidden /> Airtel Money
                </button>
                <button
                  type="button"
                  aria-pressed={payMethod === "card"}
                  onClick={() => setPayMethod("card")}
                  className={`p-3 rounded-2xl border font-bold text-center transition-all flex flex-col items-center gap-1 ${
                    payMethod === "card" ? "border-primary-500 bg-blue-50 dark:bg-blue-950/40 font-bold" : "border-canvas-silk dark:border-slate-800"
                  }`}
                >
                  <CreditCard className="h-5 w-5 text-primary-500" aria-hidden /> Card POS
                </button>
              </div>
            </div>

            {payMethod !== "card" && (
              <div>
                <label className="font-bold">Mobile Money Number</label>
                <input
                  type="tel"
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-graphite-300 dark:border-slate-700 text-center font-bold"
                  placeholder="097X XXX XXX"
                  value={payPhone}
                  onChange={(e) => setPayPhone(e.target.value)}
                />
              </div>
            )}

            {billRef ? (
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500 text-center space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-300">Bill Slip Ready</p>
                <p className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">{billRef}</p>
                <p className="text-2xl font-bold text-emerald-600">K{billAmount.toFixed(2)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-300 font-medium">
                  Pay at the billing counter (cash / card / MoMo POS) or in the Doc' O Clock app using this reference.
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handlePrintBill}
                    className="flex-1 py-2.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs"
                  >
                    Print Bill Slip
                  </button>
                  <button
                    onClick={() => { setBillRef(null); goMode("menu"); }}
                    className="flex-1 py-2.5 rounded-2xl border border-graphite-300 dark:border-slate-700 font-bold text-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleProcessPayment}
                disabled={isProcessingPay}
                className="w-full py-3.5 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm shadow-sm active:scale-95 transition-all disabled:opacity-50"
              >
                {isProcessingPay ? "Preparing Bill Slip..." : `Get Bill Slip (K${billAmount.toFixed(2)})`}
              </button>
            )}
          </div>
        )}

        {/* 5. Success / Token Printed Screen — always a REAL queue token
            from the hospital's queue, never a locally invented number. */}
        {mode === "success" && (
          <div className="max-w-md mx-auto p-8 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500 shadow-xl text-center space-y-6">
            <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold mx-auto">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <div>
              <span className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-300 tracking-wider">Your Queue Token Number</span>
              <div className="text-6xl font-bold font-mono text-primary-500 mt-2">
                {generatedToken.number}
              </div>
              {generatedToken.alreadyCheckedIn && (
                <p className="text-xs font-bold text-emerald-600 mt-2">You were already checked in today — this is your token.</p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-canvas-silk text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-300">Patient:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{generatedToken.patient}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-300">Department:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{generatedToken.dept}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-300">Please Proceed To:</span>
                <span className="font-bold text-emerald-600">Waiting Area</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 dark:text-slate-300 shrink-0">Next Step:</span>
                <span className="font-bold text-right">Watch the waiting-room display for your token number</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={handlePrintSlip}
                className="w-full py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs flex items-center justify-center gap-2 shadow-xs"
              >
                <Printer className="h-4 w-4" /> Print Token Paper Slip
              </button>

              <button
                onClick={() => goMode("menu")}
                className="w-full py-2.5 rounded-2xl text-slate-500 dark:text-slate-400 dark:text-slate-300 hover:text-slate-700 font-bold text-xs"
              >
                Finished (Return to Home Screen)
              </button>
            </div>
          </div>
        )}
        </>)}
      </div>

      {/* Kiosk Footer */}
      <div className="max-w-4xl mx-auto w-full text-center text-xs text-slate-400 dark:text-slate-300 font-medium">
        Doc' O Clock Digital Health Network • {institutionName ? `${institutionName} Self-Service Kiosk` : "Kiosk Terminal"}
      </div>
    </div>
  );
};

export default SelfServiceKiosk;
