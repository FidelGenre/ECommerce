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
            
            // Regex to find inputs or textareas that have value={something.PROP} or value={PROP}
            // and don't already have a maxLength attribute
            let modified = false;
            
            // 1. Process <input> and <textarea> tags that span multiple lines or single line
            // We use a replacer function on tags
            content = content.replace(/<(input|textarea)([\s\S]*?)>/g, (match, tag, attrs) => {
                // If it already has a generic type checkbox, number, file, skip
                if (attrs.includes('type="checkbox"') || attrs.includes('type="number"') || attrs.includes('type="radio"') || attrs.includes('maxLength')) {
                    return match;
                }
                
                // Extract value={...}
                const valueMatch = attrs.match(/value=\{([^}]+)\}/)
                if (valueMatch) {
                    const val = valueMatch[1] // e.g. "form.firstName"
                    const parts = val.split('.')
                    const prop = parts[parts.length - 1] // e.g. "firstName"
                    
                    if (limits[prop]) {
                        modified = true;
                        // Inject maxLength={XX}
                        if (match.endsWith('/>')) {
                            return `<${tag}${attrs.substring(0, attrs.length - 1)} maxLength={${limits[prop]}} />`
                        } else {
                            return `<${tag}${attrs} maxLength={${limits[prop]}}>`
                        }
                    }
                }
                return match;
            })
            
            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8')
                console.log(`Updated ${fullPath}`)
            }
        }
    }
}

processDirectory('client/src/app/admin')
console.log('Frontend max lengths injected.')
