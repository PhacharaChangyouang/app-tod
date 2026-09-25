'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AhaIcon from './AhaIcon';

const initialRegister = { firstName:'',lastName:'',phone:'',email:'',username:'',password:'',confirmPassword:'',role:'elderly',age:'',termsAccepted:false };

export default function LoginForm({ onSubmit }) {
  const router = useRouter();
  const [mode,setMode]=useState('password');
  const [identifier,setIdentifier]=useState(''); const [password,setPassword]=useState(''); const [showPassword,setShowPassword]=useState(false); const [showRegisterPassword,setShowRegisterPassword]=useState(false); const [showConfirmPassword,setShowConfirmPassword]=useState(false);
  const [register,setRegister]=useState(initialRegister); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  useEffect(()=>{if(typeof window==='undefined')return;const params=new URLSearchParams(window.location.search);if(params.get('mode')==='register')setMode('register');},[]);
  const run=async(payload)=>{setError('');setBusy(true);try{await onSubmit({...payload,setError});}finally{setBusy(false);}};
  const openRegister=()=>{setError('');setMode('register');if(typeof window!=='undefined')window.history.replaceState(null,'','/login?mode=register');};
  const backToLogin=()=>{setError('');setMode('password');if(typeof window!=='undefined')window.history.replaceState(null,'','/login');};
  const updateRegister=(key,value)=>setRegister((v)=>({...v,[key]:value}));
  const validateRegistration=()=>{const r=register;
    if(!r.firstName.trim()||!r.lastName.trim())return'กรุณากรอกชื่อและนามสกุล';
    if(!/^0\d{9}$/.test(r.phone))return'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลักและขึ้นต้นด้วย 0';
    if(!/^\S+@\S+\.\S+$/.test(r.email.trim()))return'กรุณากรอกอีเมลให้ถูกต้อง';
    if(!/^[A-Za-z0-9]{4,30}$/.test(r.username))return'ชื่อผู้ใช้ต้องมี 4–30 ตัว และใช้ภาษาอังกฤษหรือตัวเลขเท่านั้น';
    if(!/^(?=.*[A-Za-z])(?=.*\d).{12,72}$/.test(r.password))return'รหัสผ่านต้องมี 12–72 ตัว และมีทั้งตัวอักษรภาษาอังกฤษกับตัวเลข';
    if(r.password!==r.confirmPassword)return'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน';
    if(!['elderly','caregiver'].includes(r.role))return'กรุณาเลือกประเภทบัญชี';
    if(r.role==='elderly'&&(!r.age||Number(r.age)<1||Number(r.age)>120))return'กรุณากรอกอายุ 1–120 ปี';
    if(!r.termsAccepted)return'กรุณายอมรับเงื่อนไขการใช้งานและนโยบายข้อมูลส่วนบุคคล'; return'';
  };
  const submit=(e)=>{e.preventDefault();
    if(mode==='password')return run({mode:'loginPassword',identifier,password});
    const validationError=validateRegistration();if(validationError){setError(validationError);return;}return run({mode:'registerPassword',...register});
  };

  return <main className="aha-auth-page">
    <section className="aha-auth-card">
      <aside className="aha-auth-brand-panel">
        <div className="aha-auth-brand"><div className="aha-auth-logo"><AhaIcon name="heart" size={25}/></div><div><strong>AHA</strong><span>AI Health Assistant</span></div></div>
        <div className="aha-auth-message"><small>ดูแลสุขภาพให้ง่ายขึ้น</small><h1>เตือนยา<br/>ไม่พลาดทุกวัน</h1><p>ผู้ช่วยสุขภาพสำหรับผู้สูงอายุและผู้ดูแล พร้อมการแจ้งเตือนและการติดตามในระบบเดียว</p></div>
        <div className="aha-auth-points"><div><AhaIcon name="pill" size={18}/><span>เตือนการทานยาตามเวลา</span></div><div><AhaIcon name="users" size={18}/><span>เชื่อมต่อผู้สูงอายุและผู้ดูแล</span></div></div>
      </aside>

      <section className="aha-auth-form-panel">
        <div className="aha-auth-heading"><div className="aha-auth-kicker">AHA</div><h2>{mode==='register'?'สร้างบัญชี AHA':'ยินดีต้อนรับกลับ'}</h2><p>{mode==='register'?'กรอกข้อมูลเพื่อเริ่มใช้งาน':'เข้าสู่ระบบเพื่อดูข้อมูลและการแจ้งเตือนของคุณ'}</p></div>

        {mode==='register'&&<button type="button" className="aha-auth-back" onClick={backToLogin}>← กลับไปเข้าสู่ระบบ</button>}

        <form onSubmit={submit}>
          {mode==='password'&&<>
            <div className="aha-auth-field"><label>ชื่อผู้ใช้ / อีเมล</label><input value={identifier} onChange={e=>setIdentifier(e.target.value)} autoComplete="username" placeholder="ชื่อผู้ใช้ หรืออีเมล" required autoFocus/></div>
            <div className="aha-auth-field"><label>รหัสผ่าน</label><div className="aha-auth-password-wrap"><input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" placeholder="รหัสผ่าน" required/><button type="button" className="aha-auth-password-toggle" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'ซ่อนรหัสผ่าน':'แสดงรหัสผ่าน'} aria-pressed={showPassword}>{showPassword?'ซ่อน':'แสดง'}</button></div></div>
            <div className="aha-auth-row"><button type="button" className="aha-auth-link" onClick={()=>router.push('/forgot-password')}>ลืมรหัสผ่าน?</button><button type="button" className="aha-auth-link" onClick={openRegister}>ยังไม่มีบัญชี? <strong>สมัครสมาชิก</strong></button></div>
          </>}
          {mode==='register'&&<>
            <div className="aha-auth-field-row"><div className="aha-auth-field"><label>ชื่อ</label><input value={register.firstName} onChange={e=>updateRegister('firstName',e.target.value)} required/></div><div className="aha-auth-field"><label>นามสกุล</label><input value={register.lastName} onChange={e=>updateRegister('lastName',e.target.value)} required/></div></div>
            <div className="aha-auth-field"><label>เบอร์โทรศัพท์</label><input type="tel" inputMode="numeric" value={register.phone} onChange={e=>updateRegister('phone',e.target.value.replace(/\D/g,'').slice(0,10))} placeholder="0XXXXXXXXX" required/></div>
            <div className="aha-auth-field"><label>อีเมล</label><input type="email" value={register.email} onChange={e=>updateRegister('email',e.target.value)} placeholder="name@example.com" required/></div>
            <div className="aha-auth-field"><label>ชื่อผู้ใช้</label><input value={register.username} onChange={e=>updateRegister('username',e.target.value.replace(/[^A-Za-z0-9]/g,'').slice(0,30))} placeholder="เช่น ahauser01" required/><small>ใช้ภาษาอังกฤษและตัวเลขเท่านั้น</small></div>
            <div className="aha-auth-field-row"><div className="aha-auth-field"><label>รหัสผ่าน</label><div className="aha-auth-password-wrap"><input type={showRegisterPassword?'text':'password'} value={register.password} onChange={e=>updateRegister('password',e.target.value)} placeholder="อย่างน้อย 12 ตัว" required/><button type="button" className="aha-auth-password-toggle" onClick={()=>setShowRegisterPassword(v=>!v)} aria-label={showRegisterPassword?'ซ่อนรหัสผ่าน':'แสดงรหัสผ่าน'} aria-pressed={showRegisterPassword}>{showRegisterPassword?'ซ่อน':'แสดง'}</button></div></div><div className="aha-auth-field"><label>ยืนยันรหัสผ่าน</label><div className="aha-auth-password-wrap"><input type={showConfirmPassword?'text':'password'} value={register.confirmPassword} onChange={e=>updateRegister('confirmPassword',e.target.value)} required/><button type="button" className="aha-auth-password-toggle" onClick={()=>setShowConfirmPassword(v=>!v)} aria-label={showConfirmPassword?'ซ่อนรหัสผ่าน':'แสดงรหัสผ่าน'} aria-pressed={showConfirmPassword}>{showConfirmPassword?'ซ่อน':'แสดง'}</button></div></div></div>
            <div className="aha-auth-field"><label>ประเภทบัญชี</label><div className="aha-auth-role-grid"><button type="button" className={register.role==='elderly'?'active':''} onClick={()=>updateRegister('role','elderly')}><AhaIcon name="heart" size={19}/><span><strong>ผู้สูงอายุ</strong><small>ติดตามยาและสุขภาพ</small></span></button><button type="button" className={register.role==='caregiver'?'active':''} onClick={()=>updateRegister('role','caregiver')}><AhaIcon name="users" size={19}/><span><strong>ผู้ดูแล</strong><small>ดูแลผู้สูงอายุ</small></span></button></div></div>
            {register.role==='elderly'&&<div className="aha-auth-field"><label>อายุ</label><input type="number" min="1" max="120" value={register.age} onChange={e=>updateRegister('age',e.target.value)} required/></div>}
            <label className="aha-auth-terms"><input type="checkbox" checked={register.termsAccepted} onChange={e=>updateRegister('termsAccepted',e.target.checked)} required/><span>ฉันยอมรับเงื่อนไขการใช้งานและรับทราบการเก็บและใช้ข้อมูลที่จำเป็นต่อการให้บริการของ AHA</span></label>
          </>}
          {error&&<div className="aha-auth-error" role="alert"><strong>ไม่สามารถดำเนินการได้</strong><span>{error}</span></div>}
          <button className="aha-auth-submit" disabled={busy}>{busy?'กำลังดำเนินการ…':mode==='password'?'เข้าสู่ระบบ':'สมัครสมาชิก'}</button>
        </form>
      </section>
    </section>

    <style jsx>{`
      .aha-auth-page{min-height:100vh;display:grid;place-items:center;padding:22px;background:#f5f8f8;color:#20343c;font-family:Arial,"Noto Sans Thai",sans-serif}
      .aha-auth-card{width:min(980px,100%);display:grid;grid-template-columns:42% 58%;background:#fff;border:1px solid #dbe6e8;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(30,67,80,.12)}
      .aha-auth-brand-panel{background:#eef8f9;padding:40px 36px;display:flex;flex-direction:column;justify-content:space-between;min-height:650px;border-right:1px solid #dbe8e9}.aha-auth-brand{display:flex;align-items:center;gap:11px;color:#173f50}.aha-auth-brand>div:last-child strong{display:block;font-size:25px;line-height:1}.aha-auth-brand span{display:block;font-size:11px;color:#78909a;margin-top:3px}.aha-auth-logo{width:46px;height:46px;border-radius:14px;background:#fff;border:1px solid #cfe3e7;display:grid;place-items:center;color:#2189ad}.aha-auth-message{margin:auto 0}.aha-auth-message small{font-weight:800;color:#2b9abf;font-size:13px}.aha-auth-message h1{font-size:39px;line-height:1.18;margin:12px 0;color:#203c47}.aha-auth-message p{max-width:310px;color:#667e87;font-size:15px;line-height:1.75;margin:0}.aha-auth-points{display:grid;gap:9px}.aha-auth-points div{display:flex;align-items:center;gap:9px;color:#536c75;font-size:13px}.aha-auth-points svg{color:#2b9abf}
      .aha-auth-form-panel{padding:40px 48px;max-height:calc(100vh - 44px);overflow:auto}.aha-auth-heading{margin-bottom:18px}.aha-auth-kicker{font-size:12px;font-weight:900;letter-spacing:1px;color:#2b9abf;margin-bottom:6px}.aha-auth-heading h2{margin:0;font-size:30px;line-height:1.25;color:#203c47}.aha-auth-heading p{margin:6px 0 0;color:#788b92;font-size:14px}.aha-auth-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;background:#f2f5f5;border:1px solid #e0e7e8;border-radius:12px;margin-bottom:20px}.aha-auth-tabs button{border:0;background:transparent;border-radius:8px;padding:10px 5px;color:#7a8b91;font-weight:800}.aha-auth-tabs button.active{background:#fff;color:#1f83aa;box-shadow:0 2px 8px rgba(40,80,90,.08)}.aha-auth-back,.aha-auth-link{border:0;background:transparent;color:#2484a8;font-weight:800}.aha-auth-back{padding:0;margin-bottom:14px}.aha-auth-form-panel form{display:grid;gap:14px}.aha-auth-field{display:grid;gap:7px}.aha-auth-field label{font-size:14px;font-weight:800;color:#304b55}.aha-auth-field input,.aha-auth-field select{width:100%;min-height:50px;border:1px solid #d3e0e3;border-radius:12px;background:#fff;color:#20343c;padding:0 14px;outline:none;font-size:16px}.aha-auth-field input:focus{border-color:#39acd0;box-shadow:0 0 0 3px rgba(57,172,208,.11)}.aha-auth-password-wrap{position:relative}.aha-auth-password-wrap input{padding-right:68px}.aha-auth-password-toggle{position:absolute;right:9px;top:50%;transform:translateY(-50%);border:0;background:transparent;color:#2484a8;font-weight:800;font-size:12px;padding:7px 5px;cursor:pointer}.aha-auth-password-toggle:focus-visible{outline:2px solid #39acd0;outline-offset:2px;border-radius:6px}.aha-auth-field small{color:#809198;font-size:12px}.aha-auth-field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.aha-auth-row{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:-5px}.aha-auth-link{padding:3px 0;font-size:13px}.aha-auth-link strong{color:#1680a8}.aha-auth-sub{margin:0 0 2px;color:#71858c;font-size:14px;line-height:1.5}.aha-auth-role-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.aha-auth-role-grid button{min-height:62px;border:1px solid #d8e4e6;background:#fff;border-radius:12px;padding:9px 10px;display:flex;align-items:center;gap:8px;text-align:left;color:#587079}.aha-auth-role-grid button.active{border-color:#3aaed0;background:#f1fbfd;color:#1d789c;box-shadow:0 0 0 3px rgba(58,174,208,.08)}.aha-auth-role-grid strong,.aha-auth-role-grid small{display:block}.aha-auth-role-grid small{font-size:11px;color:#7d8f95;margin-top:2px}.aha-auth-terms{display:flex;gap:9px;align-items:flex-start;color:#71858c;font-size:12px;line-height:1.5}.aha-auth-terms input{margin-top:3px;accent-color:#2fa7ca}.aha-auth-error{padding:11px 13px;border-radius:11px;background:#fff1f1;color:#b5302d;border:1px solid #ffd2d0;display:grid;gap:2px;font-size:13px}.aha-auth-error strong{font-size:13px}.aha-auth-submit{width:100%;min-height:54px;border:0;border-radius:13px;background:#2085b1;color:#fff;font-weight:900;font-size:16px;box-shadow:0 9px 20px rgba(32,133,177,.18);margin-top:3px}.aha-auth-submit:disabled{opacity:.55}.aha-auth-ghost{width:100%;border:0;background:transparent;color:#2585a7;font-weight:800;padding:10px}.aha-auth-page button{cursor:pointer}
      @media(max-width:820px){.aha-auth-card{grid-template-columns:1fr}.aha-auth-brand-panel{min-height:auto;padding:25px 24px;border-right:0;border-bottom:1px solid #dbe8e9}.aha-auth-message{margin:25px 0}.aha-auth-message h1{font-size:31px}.aha-auth-points{display:none}.aha-auth-form-panel{padding:28px 24px;max-height:none}}
      @media(max-width:520px){.aha-auth-page{padding:0;display:block}.aha-auth-card{width:100%;min-height:100vh;border:0;border-radius:0;box-shadow:none}.aha-auth-brand-panel{padding:20px 18px 18px}.aha-auth-brand{gap:8px}.aha-auth-logo{width:40px;height:40px}.aha-auth-brand>div:last-child strong{font-size:22px}.aha-auth-message{margin:18px 0 0}.aha-auth-message h1{font-size:27px;margin:8px 0}.aha-auth-message p{font-size:13px;line-height:1.55}.aha-auth-form-panel{padding:22px 18px 30px}.aha-auth-heading h2{font-size:25px}.aha-auth-tabs button{font-size:12px}.aha-auth-field-row{grid-template-columns:1fr}.aha-auth-row{align-items:flex-start;flex-direction:column}.aha-auth-role-grid{grid-template-columns:1fr 1fr}.aha-auth-submit{min-height:56px}}
    `}</style>
  </main>;
}
