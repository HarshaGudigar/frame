const fs = require('fs');
const path = require('path');
const dir = 'g:/Alyxnet/frame/frontend/src/pages/solutions/hotel';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Normalize newlines to simplify regex
    content = content.replace(/\r\n/g, '\n');

    // Strip prop definitions
    content = content.replace(/\{ hotelTenant \??\}: \{ hotelTenant\?\: string \}/g, '');
    content = content.replace(/\{ hotelTenant \}: \{ hotelTenant\?\: string \}/g, '');
    content = content.replace(/\{ hotelTenant, /g, '{ ');
    content = content.replace(/, hotelTenant \}/g, ' }');
    content = content.replace(/, hotelTenant/g, '');
    content = content.replace(/\{ hotelTenant \}/g, '{}');
    content = content.replace(/hotelTenant\?\: string;/g, '');

    // Custom for Housekeeping
    content = content.replace(/\{ hotelTenant: propTenant \}: \{ hotelTenant\?\: string \}/g, '');
    content = content.replace(/hotelTenant: propTenant,/g, '');

    // Early returns
    content = content.replace(/if \(\!hotelTenant\) \{[\s\S]*?\n\s*\}/g, '');
    content = content.replace(/if \(\!hotelTenant\) return;/g, '');
    content = content.replace(/if \(\!hotelTenant \|\| /g, 'if (');
    content = content.replace(/if \(\!hotelTenant,/g, 'if (');
    content = content.replace(/if \(\!file \|\| \!hotelTenant\) /g, 'if (!file) ');
    content = content.replace(/if \(\!hotelTenant\) fetchData\(\);/g, 'fetchData();');
    content = content.replace(/if \(hotelTenant\) fetchData\(\);/g, 'fetchData();');
    content = content.replace(/if \(\!hotelTenant \|\| \!confirm/g, 'if (!confirm');

    // HTTP Headers
    content = content.replace(/, \{ headers: \{ 'x-tenant-id': hotelTenant \} \}/g, '');
    content = content.replace(/\{ headers: \{ 'x-tenant-id': hotelTenant \} \}, /g, '');
    content = content.replace(/\{ headers: \{ 'x-tenant-id': hotelTenant \} \}/g, '');
    content = content.replace(/'x-tenant-id': hotelTenant,/g, '');
    content = content.replace(/, \{\n\s*headers: \{ 'x-tenant-id': hotelTenant \},\n\s*\}/g, '');

    content = content.replace(/\{ headers: \{ 'x-tenant-id': hotelTenant \} \}/g, '');

    // UI rendering blocks like {!hotelTenant ? (...) : (...)}
    // Instead of complex regex, let's just leave them as {!undefined ? ...} and we'll see if it crashes. Actually, `hotelTenant` is just an undefined variable, which causes ReferenceError in React render. We should replace the ternary.
    // We can just replace `{hotelTenant}` with `''` if it appears in JSX.
    content = content.replace(/\{\!hotelTenant \? \([\s\S]*?\) \: \([\s\S]*?\)\}/g, '');

    // Restore line endings if needed (optional)
    content = content.replace(/\n/g, '\r\n');

    fs.writeFileSync(filePath, content);
});
console.log('Done fixing hotel module again');
