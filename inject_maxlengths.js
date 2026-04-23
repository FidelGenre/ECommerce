const fs = require('fs')
const path = require('path')

const limits = {
  address: 50,
  notes: 40,
  firstName: 40,
  lastName: 40,
  username: 40,
  name: 40,
  legalName: 40,
  alias: 40,
  barcode: 50,
  email: 50,
  phone: 20,
  taxId: 20,
  documentNumber: 20,
  type: 20,
  color: 20,
  code: 20,
  movementType: 20,
  unit: 20,
  purchaseUnit: 20,
  description: 100,
  reason: 100,
  message: 100,
  category: 50
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir)
    for (const file of files) {
        const fullPath = path.join(dir, file)
        const stat = fs.statSync(fullPath)
        
        if (stat.isDirectory()) {
            processDirectory(fullPath)
        } else if (fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8')
            let modified = false;
            
            // Reemplazar usando regex línea por línea para evitar romper JSX
            const lines = content.split('\n')
            for(let i=0; i<lines.length; i++) {
                let line = lines[i]
                if ((line.includes('<input ') || line.includes('<textarea ')) && line.includes('value={')) {
                    if (line.includes('type="checkbox"') || line.includes('type="number"') || line.includes('type="radio"') || line.includes('maxLength=')) continue;
                    
                    const valueMatch = line.match(/value=\{([^}]+)\}/)
                    if (valueMatch) {
                        const val = valueMatch[1]
                        const parts = val.split('.')
                        const prop = parts[parts.length - 1]
                        
                        if (limits[prop]) {
                            // Insert maxLength before the value attribute
                            lines[i] = line.replace('value={', `maxLength={${limits[prop]}} value={`)
                            modified = true
                        }
                    }
                }
            }
            
            if (modified) {
                fs.writeFileSync(fullPath, lines.join('\n'), 'utf8')
                console.log(`Updated ${fullPath}`)
            }
        }
    }
}

processDirectory('client/src/app/admin')
console.log('Frontend max lengths injected.')
