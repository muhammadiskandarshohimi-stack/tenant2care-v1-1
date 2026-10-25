import sharp from 'sharp';
export const ID_PHOTO_BUCKET = 'tenant-identity-cards';
export async function stampIdentityCard(input: Buffer) {
 const image = sharp(input, {limitInputPixels: 24000000, failOn: 'error'});
 const meta = await image.metadata();
 if (!['jpeg','png','webp'].includes(meta.format || '') || !meta.width || !meta.height || Math.min(meta.width,meta.height)<240) throw Error('Use a clear JPG, PNG or WebP photo of your identity card.');
 const {data,info} = await image.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).flatten({background:'#fff'}).jpeg({quality:88}).toBuffer({resolveWithObject:true});
 const w=info.width,h=info.height, size=Math.max(14,Math.round(w/29));
 const overlay=Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><g transform="translate(${w/2},${h/2}) rotate(-20)"><path d="M ${-w*.45} ${-size*1.2} H ${w*.45} M ${-w*.45} ${size*.9} H ${w*.45}" stroke="#a11932" stroke-opacity="0.8" stroke-width="${Math.max(2,w/500)}"/><text x="0" y="0" dy=".35em" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="${size}" fill="#a11932" fill-opacity="0.85" stroke="white" stroke-width="${size/18}" paint-order="stroke">FOR TENANCY AGREEMENT ONLY</text></g></svg>`);
 // Re-encoding strips the original EXIF/GPS metadata. Only the stamped JPEG is returned.
 return sharp(data).composite([{input:overlay}]).jpeg({quality:88}).toBuffer();
}
