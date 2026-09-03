function generateSku(supplierName, list) {
    const cleanTarget = (supplierName || '').replace(/[^a-zA-Z]/g, '');
    let uniqueSupplierLetters = 'XXXX';
    
    if (cleanTarget) {
      const assignedPrefixes = new Map();
      const usedPrefixes = new Set();

      for (const sup of list) {
        if (assignedPrefixes.has(sup)) continue;
        
        let base = sup;
        if (base.length < 4) base = base.padEnd(4, 'x');
        
        // Preserve original case for the prefix
        let prefix = base.slice(0, 4);
        
        // We should check collisions case-insensitively to prevent Sams and SAMS being treated as different prefixes 
        // if they belong to different suppliers, but wait, the user's examples:
        // Sams- and Samo- and Sama-
        
        if (!Array.from(usedPrefixes).some(p => p.toLowerCase() === prefix.toLowerCase())) {
          assignedPrefixes.set(sup, prefix);
          usedPrefixes.add(prefix);
        } else {
          let found = false;
          for (let i = 4; i < base.length; i++) {
            let candidate = base.slice(0, 3) + base[i];
            if (!Array.from(usedPrefixes).some(p => p.toLowerCase() === candidate.toLowerCase())) {
               prefix = candidate;
               found = true;
               break;
            }
          }
          if (!found) {
             let counter = 1;
             while (true) {
                let candidate = (base.slice(0, 3) + counter.toString()).slice(0, 4);
                if (!Array.from(usedPrefixes).some(p => p.toLowerCase() === candidate.toLowerCase())) {
                   prefix = candidate;
                   break;
                }
                counter++;
             }
          }
          assignedPrefixes.set(sup, prefix);
          usedPrefixes.add(prefix);
        }
      }
      uniqueSupplierLetters = assignedPrefixes.get(cleanTarget) || 'XXXX';
    }
    return uniqueSupplierLetters;
}

const list = ["cartoon", "Elephant", "Samsung", "Samson", "Samsoan"];
for (const s of list) {
  console.log(s, generateSku(s, list));
}
