import Link from 'next/link';
export default function Unauthorized(){return <main style={{padding:32,fontFamily:'Arial'}}><h1>Access restricted</h1><p>This portal requires a landlord account.</p><Link href="/login">Return to login</Link></main>}
