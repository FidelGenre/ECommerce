const fs = require('fs')
const path = require('path')

const entityDir = 'server/src/main/java/com/store/api/entity'
const files = fs.readdirSync(entityDir).filter(f => f.endsWith('.java'))

for (const file of files) {
  const filePath = path.join(entityDir, file)
  let content = fs.readFileSync(filePath, 'utf8')
  
  const lines = content.split('\n')
  const newContent = []
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    
    // Check replacing existing @Column(length=)
    if (line.includes('@Column') && line.includes('length')) {
      const propLine = lines[i+1] || ''
      if (!propLine.includes('password') && !propLine.includes('imageUrl') && !propLine.includes('mpInitPoint')) {
        let prop = ''
        if (propLine.includes('private String ')) {
           prop = propLine.trim().split(' ')[2].replace(';', '')
        }
        
        let size = 50
        if (['notes', 'name', 'firstName', 'lastName', 'alias', 'legalName', 'username'].includes(prop)) size = 40
        if (['address'].includes(prop)) size = 50
        if (['taxId', 'documentNumber', 'phone', 'unit', 'purchaseUnit', 'type', 'color', 'code'].includes(prop)) size = 20
        if (['documentType'].includes(prop)) size = 15
        if (['description', 'message', 'reason', 'mpPreferenceId', 'mpPaymentId'].includes(prop)) size = 100
        if (prop.includes('action') || prop.includes('entityType')) size = 40
        if (prop.includes('movementType')) size = 20
        
        line = line.replace(/length\s*=\s*\d+/, `length = ${size}`)
      }
    }
    
    // Check mapping strings without existing length
    if (line.includes('private String ')) {
      const prop = line.trim().split(' ')[2].replace(';', '')
      const prev = i > 0 ? lines[i-1].trim() : ''
      
      let size = 50
      if (['notes', 'name', 'firstName', 'lastName', 'alias', 'legalName', 'username', 'barcode'].includes(prop)) size = 40
      if (['address'].includes(prop)) size = 50
      if (['taxId', 'documentNumber', 'phone', 'unit', 'purchaseUnit', 'type', 'color', 'code'].includes(prop)) size = 20
      if (['documentType'].includes(prop)) size = 15
      if (['description', 'message', 'reason', 'mpPreferenceId', 'mpPaymentId', 'category'].includes(prop)) size = 100
      if (prop.includes('action') || prop.includes('entityType')) size = 40
      if (prop.includes('movementType')) size = 20
      
      if (!['passwordHash', 'imageUrl', 'mpInitPoint', 'details'].includes(prop)) {
        if (!prev.startsWith('@Column')) {
          newContent.push(`    @Column(length = ${size})`)
        } else if (prev.startsWith('@Column') && !prev.includes('length')) {
          newContent[newContent.length - 1] = prev.replace('@Column(', `@Column(length = ${size}, `).replace('@Column', `@Column(length = ${size})`)
        }
      }
    }
    
    newContent.push(line)
  }
  
  fs.writeFileSync(filePath, newContent.join('\n'), 'utf8')
}
console.log('Entities mapped!')
