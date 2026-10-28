import sharp from 'sharp';
export const ID_PHOTO_BUCKET = 'tenant-identity-cards';

// Small vector alphabet: the watermark never depends on server fonts.
// Each letter is a 5x7 grid, represented by reusable SVG geometry.
const LETTERS:Record<string,string[]>={
 'A':['01110','10001','10001','11111','10001','10001','10001'],
 'C':['01111','10000','10000','10000','10000','10000','01111'],
 'D':['11110','10001','10001','10001','10001','10001','11110'],
 'E':['11111','10000','10000','11110','10000','10000','11111'],
 'F':['11111','10000','10000','11110','10000','10000','10000'],
 'G':['01111','10000','10000','10111','10001','10001','01111'],
 'L':['10000','10000','10000','10000','10000','10000','11111'],
 'M':['10001','11011','10101','10101','10001','10001','10001'],
 'N':['10001','11001','10101','10011','10001','10001','10001'],
 'O':['01110','10001','10001','10001','10001','10001','01110'],
 'R':['11110','10001','10001','11110','10100','10010','10001'],
 'T':['11111','00100','00100','00100','00100','00100','00100'],
 'Y':['10001','10001','01010','00100','00100','00100','00100'],
 ' ':['00000','00000','00000','00000','00000','00000','00000'],
};
const WATERMARK='FOR TENANCY AGREEMENT ONLY';
function letteringPath(){
 let path='';
 for(let i=0;i<WATERMARK.length;i++){
  const rows=LETTERS[WATERMARK[i]];
  if(!rows)throw Error('Unsupported watermark letter');
  for(let y=0;y<7;y++)for(let x=0;x<5;x++)
   if(rows[y][x]==='1'){
    const px=i*6+x;
    path+=`M${px} ${y}h1v1h-1z`;
   }
 }
 return path;
}
const WATERMARK_PATH=letteringPath();
export async function stampIdentityCard(input:Buffer){
 const image=sharp(input,{limitInputPixels:24000000,failOn:'error'});
 const meta=await image.metadata();
 if(!['jpeg','png','webp'].includes(meta.format||'')||!meta.width||!meta.height||Math.min(meta.width,meta.height)<240)
  throw Error('Use a clear JPG, PNG or WebP photo of your identity card.');
 const {data,info}=await image.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).flatten({background:'#fff'}).jpeg({quality:90}).toBuffer({resolveWithObject:true});
 const w=info.width,h=info.height;
 const lettersWidth=WATERMARK.length*6-1;
 const scaleX=w*.82/lettersWidth,scaleY=Math.max(3.8,Math.min(w*.008,h*.014));
 const bandHeight=scaleY*10;
 const lineWidth=w*.9;
 const overlay=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
 <g transform="translate(${w/2} ${h/2}) rotate(-20)">
  <rect x="${-lineWidth/2}" y="${-bandHeight/2}" width="${lineWidth}" height="${bandHeight}" rx="${scaleY*1.2}" fill="white" fill-opacity=".78"/>
  <path d="M ${-lineWidth/2} ${-bandHeight/2} H ${lineWidth/2} M ${-lineWidth/2} ${bandHeight/2} H ${lineWidth/2}" stroke="#a11932" stroke-width="${Math.max(2,w/500)}" stroke-opacity=".95"/>
  <g transform="translate(${-lettersWidth*scaleX/2} ${-3.5*scaleY}) scale(${scaleX} ${scaleY})">
   <path d="${WATERMARK_PATH}" fill="#88102d"/>
  </g>
 </g></svg>`);
 // Re-encoding strips GPS and other EXIF metadata.
 return sharp(data).composite([{input:overlay}]).jpeg({quality:90}).toBuffer();
}
