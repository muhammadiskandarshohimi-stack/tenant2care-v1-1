const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript'),sharp=require('sharp');
const m={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/identity-photo.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,{exports:m.exports,module:m,require,Buffer,Error});
(async()=>{
 const input=await sharp({create:{width:1200,height:760,channels:3,background:'#fff'}}).jpeg().withMetadata({exif:{IFD0:{Artist:'Test metadata'}}}).toBuffer();
 const output=await m.exports.stampIdentityCard(input),meta=await sharp(output).metadata();assert.equal(meta.format,'jpeg');assert(!meta.exif);assert.equal(meta.width,1200);
 const {data,info}=await sharp(output).raw().toBuffer({resolveWithObject:true});let red=0;
 for(let i=0;i<data.length;i+=info.channels)if(data[i]>data[i+1]+30&&data[i]>data[i+2]+30)red++;
 assert(red>4000,'Diagonal red watermark must be embedded in JPEG pixels');
 await assert.rejects(()=>m.exports.stampIdentityCard(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="500" height="300"/>')));
 const small=await sharp({create:{width:100,height:100,channels:3,background:'#fff'}}).png().toBuffer();await assert.rejects(()=>m.exports.stampIdentityCard(small));
 console.log('PASS watermark is embedded in JPEG pixels, EXIF stripped, SVG and tiny images rejected');
})().catch(e=>{console.error(e);process.exitCode=1});
