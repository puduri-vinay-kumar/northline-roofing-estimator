import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { ErrorBox, Money, Spinner } from '../components.jsx';

const emptyContact = { name: '', phone: '', email: '' };

export function Estimator() {
  const [config, setConfig] = useState(null); const [failure, setFailure] = useState('');
  const [step, setStep] = useState(0); const [answers, setAnswers] = useState({});
  const [contact, setContact] = useState(emptyContact); const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null); const [submitting, setSubmitting] = useState(false);
  const load = () => { setFailure(''); api.config().then(setConfig).catch(e => setFailure(e.message)); };
  useEffect(load, []);
  if (failure) return <Shell><ErrorBox retry={load}>{failure}</ErrorBox></Shell>;
  if (!config) return <Shell><Spinner label="Loading your estimator…" /></Shell>;
  const questions = config.questions.filter(question => question.active);
  const isContact = step === questions.length; const total = questions.length + 1;
  const question = questions[step];

  const validateStep = () => {
    if (isContact) {
      const next = {}; if (!contact.name.trim()) next.name = 'Enter your name.';
      if (!/^\+?[\d\s().-]{7,20}$/.test(contact.phone)) next.phone = 'Enter a valid phone number.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) next.email = 'Enter a valid email address.';
      setErrors(next); return Object.keys(next).length === 0;
    }
    const value = answers[question.key]; let message = '';
    if (question.required && (value === undefined || value === '')) message = 'Please answer this question.';
    if (question.type === 'number' && value !== '' && (Number(value) < question.min || Number(value) > question.max)) message = `Enter a value from ${question.min.toLocaleString()} to ${question.max.toLocaleString()}.`;
    setErrors(message ? { [question.key]: message } : {}); return !message;
  };
  const next = async () => {
    if (!validateStep()) return;
    if (!isContact) { setStep(value => value + 1); return; }
    setSubmitting(true); setFailure('');
    try { setResult(await api.submit({ configVersion: config.config_version, answers, contact })); }
    catch (error) { setErrors(error.data?.errors || {}); setFailure(error.message); }
    finally { setSubmitting(false); }
  };
  const restart = () => { setStep(0); setAnswers({}); setContact(emptyContact); setResult(null); setErrors({}); load(); };

  return <Shell business={config.business.name}>
    <main className="estimator-shell">
      {result ? <section className="result" aria-live="polite">
        <div className="result-mark">✓</div><p className="step-label">Your planning estimate</p>
        <h1><Money value={result.estimate_low} /> – <Money value={result.estimate_high} /></h1>
        <p>Thanks, {result.name}. This is a planning range, not a final quote. Northline can confirm site conditions and exact pricing after a roof inspection.</p>
        <button className="primary" onClick={restart}>Start another estimate</button>
      </section> : <>
        <div className="progress-copy"><span>Step {step + 1} of {total}</span><span>{Math.round(((step + 1) / total) * 100)}% complete</span></div>
        <div className="progress"><span style={{ width: `${((step + 1) / total) * 100}%` }} /></div>
        <section className="question-panel">
          <p className="step-label">A clearer roof estimate, in minutes.</p>
          {isContact ? <ContactStep contact={contact} setContact={setContact} errors={errors} /> : <Question question={question} value={answers[question.key]} onChange={value => { setAnswers(current => ({ ...current, [question.key]: value })); setErrors({}); }} error={errors[question.key]} />}
          {failure ? <ErrorBox>{failure}</ErrorBox> : null}
          <div className="actions"><button className="secondary" disabled={step === 0 || submitting} onClick={() => { setStep(value => value - 1); setErrors({}); }}>← Back</button><button className="primary" disabled={submitting} onClick={next}>{submitting ? 'Calculating…' : isContact ? 'Get my estimate' : 'Continue →'}</button></div>
        </section>
        <p className="fine-print">Your details are used only to follow up about this estimate. Final pricing requires an on-site inspection.</p>
      </>}
    </main>
  </Shell>;
}

function Shell({ business = 'Northline Roofing & Exteriors', children }) { return <div className="public-page"><header className="public-header"><a href="/" className="brand"><span className="brand-mark">N</span><span>{business}<small>Columbus, Ohio</small></span></a><a href="tel:+16145550146">Call (614) 555-0146</a></header>{children}</div>; }

function Question({ question, value, onChange, error }) { return <div>
  <h1>{question.label}</h1><p className="helper">{question.type === 'select' ? 'Choose the option that best matches your project.' : `Enter a value in ${question.unit}.`}</p>
  {question.type === 'number' ? <label className="number-field"><span>{question.unit}</span><input autoFocus type="number" min={question.min} max={question.max} value={value ?? ''} onChange={e => onChange(e.target.value)} aria-invalid={!!error} aria-describedby="question-error" /></label> : <div className="option-list">{question.options.map(option => <button key={option.value} className={`option ${value === option.value ? 'selected' : ''}`} onClick={() => onChange(option.value)}><span>{option.label}</span><i aria-hidden="true">{value === option.value ? '●' : '○'}</i></button>)}</div>}
  {error ? <p id="question-error" className="field-error">{error}</p> : null}
  </div>; }

function ContactStep({ contact, setContact, errors }) { const field = (key, label, type, placeholder) => <label className="field"><span>{label}</span><input type={type} value={contact[key]} placeholder={placeholder} onChange={e => setContact(current => ({ ...current, [key]: e.target.value }))} aria-invalid={!!errors[key]} />{errors[key] ? <small>{errors[key]}</small> : null}</label>; return <div><h1>Where should we send your estimate?</h1><p className="helper">We’ll also use these details if you’d like to discuss the project.</p><div className="contact-grid">{field('name', 'Full name', 'text', 'Dale Whitmore')}{field('phone', 'Phone', 'tel', '(614) 555-0123')}{field('email', 'Email', 'email', 'you@example.com')}</div></div>; }
