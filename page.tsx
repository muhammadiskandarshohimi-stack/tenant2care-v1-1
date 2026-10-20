import Link from 'next/link';
export default function Unauthorized() {
  return <main style={{padding:32,fontFamily:'Arial,sans-serif'}}><h1>Access denied</h1><p>Your account is not authorized as a landlord.</p><Link href="/login">Return to login</Link><form action="/auth/signout" method="post"><button>Sign out</button></form></main>;
}
