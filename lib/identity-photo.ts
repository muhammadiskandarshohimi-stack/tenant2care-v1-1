import sharp from 'sharp';
// Fixed lettering is stored as outlines so serverless image rendering needs no fonts.
// Outlined text: FOR TENANCY AGREEMENT ONLY (DejaVu Sans Bold).
/*
Copyright: Copyright (c) 2003 by Bitstream, Inc. All Rights Reserved. 
Bitstream Vera is a trademark of Bitstream, Inc.
DejaVu changes are in public domain.
License: bitstream-vera
Permission is hereby granted, free of charge, to any person obtaining a copy
of the fonts accompanying this license ("Fonts") and associated
documentation files (the "Font Software"), to reproduce and distribute the
Font Software, including without limitation the rights to use, copy, merge,
publish, distribute, and/or sell copies of the Font Software, and to permit
persons to whom the Font Software is furnished to do so, subject to the
following conditions:

The above copyright and trademark notices and this permission notice shall
be included in all copies of one or more of the Font Software typefaces.

The Font Software may be modified, altered, or added to, and in particular
the designs of glyphs or characters in the Fonts may be modified and
additional glyphs or characters may be added to the Fonts, only if the fonts
are renamed to names not containing either the words "Bitstream" or the word
"Vera".

This License becomes null and void to the extent applicable to Fonts or Font
Software that has been modified and is distributed under the "Bitstream
Vera" names.

The Font Software may be sold as part of a larger software package but no
copy of one or more of the Font Software typefaces may be sold by itself.

THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF COPYRIGHT, PATENT,
TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL BITSTREAM OR THE GNOME
FOUNDATION BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, INCLUDING
ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF
THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM OTHER DEALINGS IN THE
FONT SOFTWARE.

Except as contained in this notice, the names of Gnome, the Gnome
Foundation, and Bitstream Inc., shall not be used in advertising or
otherwise to promote the sale, use or other dealings in this Font Software
without prior written authorization from the Gnome Foundation or Bitstream
Inc., respectively. For further information, contact: fonts at gnome dot
org.
*/
const WATERMARK_PATH = 'M188 -1493H1227V-1202H573V-924H1188V-633H573V0H188ZM2269 -1241Q2093 -1241 1996.0 -1111.0Q1899 -981 1899 -745Q1899 -510 1996.0 -380.0Q2093 -250 2269 -250Q2446 -250 2543.0 -380.0Q2640 -510 2640 -745Q2640 -981 2543.0 -1111.0Q2446 -1241 2269 -1241ZM2269 -1520Q2629 -1520 2833.0 -1314.0Q3037 -1108 3037 -745Q3037 -383 2833.0 -177.0Q2629 29 2269 29Q1910 29 1705.5 -177.0Q1501 -383 1501 -745Q1501 -1108 1705.5 -1314.0Q1910 -1520 2269 -1520ZM3875 -831Q3996 -831 4048.5 -876.0Q4101 -921 4101 -1024Q4101 -1126 4048.5 -1170.0Q3996 -1214 3875 -1214H3713V-831ZM3713 -565V0H3328V-1493H3916Q4211 -1493 4348.5 -1394.0Q4486 -1295 4486 -1081Q4486 -933 4414.5 -838.0Q4343 -743 4199 -698Q4278 -680 4340.5 -616.5Q4403 -553 4467 -424L4676 0H4266L4084 -371Q4029 -483 3972.5 -524.0Q3916 -565 3822 -565ZM5440 -1493H6816V-1202H6321V0H5936V-1202H5440ZM7015 -1493H8054V-1202H7400V-924H8015V-633H7400V-291H8076V0H7015ZM8414 -1493H8844L9387 -469V-1493H9752V0H9322L8779 -1024V0H8414ZM11034 -272H10432L10337 0H9950L10503 -1493H10962L11515 0H11128ZM10528 -549H10937L10733 -1143ZM11713 -1493H12143L12686 -469V-1493H13051V0H12621L12078 -1024V0H11713ZM14611 -82Q14505 -27 14390.0 1.0Q14275 29 14150 29Q13777 29 13559.0 -179.5Q13341 -388 13341 -745Q13341 -1103 13559.0 -1311.5Q13777 -1520 14150 -1520Q14275 -1520 14390.0 -1492.0Q14505 -1464 14611 -1409V-1100Q14504 -1173 14400.0 -1207.0Q14296 -1241 14181 -1241Q13975 -1241 13857.0 -1109.0Q13739 -977 13739 -745Q13739 -514 13857.0 -382.0Q13975 -250 14181 -250Q14296 -250 14400.0 -284.0Q14504 -318 14611 -391ZM14722 -1493H15143L15483 -961L15823 -1493H16245L15676 -629V0H15291V-629ZM18032 -272H17430L17335 0H16948L17501 -1493H17960L18513 0H18126ZM17526 -549H17935L17731 -1143ZM20053 -111Q19909 -41 19754.0 -6.0Q19599 29 19434 29Q19061 29 18843.0 -179.5Q18625 -388 18625 -745Q18625 -1106 18847.0 -1313.0Q19069 -1520 19455 -1520Q19604 -1520 19740.5 -1492.0Q19877 -1464 19998 -1409V-1100Q19873 -1171 19749.5 -1206.0Q19626 -1241 19502 -1241Q19272 -1241 19147.5 -1112.5Q19023 -984 19023 -745Q19023 -508 19143.0 -379.0Q19263 -250 19484 -250Q19544 -250 19595.5 -257.5Q19647 -265 19688 -281V-571H19453V-829H20053ZM20939 -831Q21060 -831 21112.5 -876.0Q21165 -921 21165 -1024Q21165 -1126 21112.5 -1170.0Q21060 -1214 20939 -1214H20777V-831ZM20777 -565V0H20392V-1493H20980Q21275 -1493 21412.5 -1394.0Q21550 -1295 21550 -1081Q21550 -933 21478.5 -838.0Q21407 -743 21263 -698Q21342 -680 21404.5 -616.5Q21467 -553 21531 -424L21740 0H21330L21148 -371Q21093 -483 21036.5 -524.0Q20980 -565 20886 -565ZM21969 -1493H23008V-1202H22354V-924H22969V-633H22354V-291H23030V0H21969ZM23368 -1493H24407V-1202H23753V-924H24368V-633H23753V-291H24429V0H23368ZM24767 -1493H25257L25597 -694L25939 -1493H26428V0H26064V-1092L25720 -287H25476L25132 -1092V0H24767ZM26805 -1493H27844V-1202H27190V-924H27805V-633H27190V-291H27866V0H26805ZM28204 -1493H28634L29177 -469V-1493H29542V0H29112L28569 -1024V0H28204ZM29740 -1493H31116V-1202H30621V0H30236V-1202H29740ZM32710 -1241Q32534 -1241 32437.0 -1111.0Q32340 -981 32340 -745Q32340 -510 32437.0 -380.0Q32534 -250 32710 -250Q32887 -250 32984.0 -380.0Q33081 -510 33081 -745Q33081 -981 32984.0 -1111.0Q32887 -1241 32710 -1241ZM32710 -1520Q33070 -1520 33274.0 -1314.0Q33478 -1108 33478 -745Q33478 -383 33274.0 -177.0Q33070 29 32710 29Q32351 29 32146.5 -177.0Q31942 -383 31942 -745Q31942 -1108 32146.5 -1314.0Q32351 -1520 32710 -1520ZM33769 -1493H34199L34742 -469V-1493H35107V0H34677L34134 -1024V0H33769ZM35483 -1493H35868V-291H36544V0H35483ZM36580 -1493H37001L37341 -961L37681 -1493H38103L37534 -629V0H37149V-629Z';
const WATERMARK_WIDTH = 38083;
const WATERMARK_EM = 2048;
export const ID_PHOTO_BUCKET = 'tenant-identity-cards';
export async function stampIdentityCard(input: Buffer) {
 const image = sharp(input, {limitInputPixels: 24000000, failOn: 'error'});
 const meta = await image.metadata();
 if (!['jpeg','png','webp'].includes(meta.format || '') || !meta.width || !meta.height || Math.min(meta.width,meta.height)<240) throw Error('Use a clear JPG, PNG or WebP photo of your identity card.');
 const {data,info} = await image.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).flatten({background:'#fff'}).jpeg({quality:88}).toBuffer({resolveWithObject:true});
 const w=info.width,h=info.height, size=Math.max(14,Math.round(w/29));
 const textScale=Math.min(size/WATERMARK_EM,w*.86/WATERMARK_WIDTH);
 const overlay=Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><g transform="translate(${w/2},${h/2}) rotate(-20)"><path d="M ${-w*.45} ${-size*1.2} H ${w*.45} M ${-w*.45} ${size*.9} H ${w*.45}" stroke="#a11932" stroke-opacity="0.8" stroke-width="${Math.max(2,w/500)}"/><g transform="translate(${-WATERMARK_WIDTH*textScale/2},${size*.35}) scale(${textScale})"><path d="${WATERMARK_PATH}" fill="#a11932" fill-opacity="0.85" stroke="white" stroke-width="${size/18/textScale}" paint-order="stroke"/></g></g></svg>`);
 // Re-encoding strips the original EXIF/GPS metadata. Only the stamped JPEG is returned.
 return sharp(data).composite([{input:overlay}]).jpeg({quality:88}).toBuffer();
}
