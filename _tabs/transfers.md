---
title: File Transfer Generator
icon: fa-solid fa-repeat
order: 6
---

<div id="transfer-generator">
  <div style="margin: 20px 0;">
    <label for="ip-input" style="display: block; margin-bottom: 8px; font-weight: bold;">
      Enter IP Address:
    </label>
    <input 
      type="text" 
      id="ip-input" 
      placeholder="192.168.1.1" 
      style="padding: 8px 12px; width: 300px; border: 2px solid #ddd; border-radius: 4px; font-size: 14px;"
    />
    <button 
      id="generate-btn" 
      style="padding: 8px 20px; margin-left: 10px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;"
    >
      Generate
    </button>
  </div>
  
  <div id="error-msg" style="color: #dc3545; margin: 10px 0; display: none; font-weight: bold;">
  </div>
  
  <div id="result" style="margin-top: 20px; display: none;">
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; border-left: 4px solid #28a745;">
      <code id="command-output" style="font-family: 'Courier New', monospace; font-size: 14px; display: block; word-break: break-all;">
      </code>
    </div>
    <button 
      id="copy-btn" 
      style="padding: 6px 16px; margin-top: 10px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;"
    >
      Copy to Clipboard
    </button>
    <span id="copy-success" style="margin-left: 10px; color: #28a745; display: none; font-weight: bold;">
      ✓ Copied!
    </span>
  </div>
</div>

<script>
  (function() {
    const ipInput = document.getElementById('ip-input');
    const generateBtn = document.getElementById('generate-btn');
    const errorMsg = document.getElementById('error-msg');
    const result = document.getElementById('result');
    const commandOutput = document.getElementById('command-output');
    const copyBtn = document.getElementById('copy-btn');
    const copySuccess = document.getElementById('copy-success');
    
    // Validar formato de IP
    function isValidIP(ip) {
      const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
      
      if (!ipPattern.test(ip)) {
        return false;
      }
      
      const parts = ip.split('.');
      for (let part of parts) {
        const num = parseInt(part, 10);
        if (num < 0 || num > 255) {
          return false;
        }
      }
      
      return true;
    }
    
    // Generar comando
    function generateCommand() {
      const ip = ipInput.value.trim();
      
      // Ocultar mensajes previos
      errorMsg.style.display = 'none';
      result.style.display = 'none';
      copySuccess.style.display = 'none';
      
      // Validar IP
      if (!ip) {
        errorMsg.textContent = 'Please enter an IP address.';
        errorMsg.style.display = 'block';
        return;
      }
      
      if (!isValidIP(ip)) {
        errorMsg.textContent = 'Invalid IP address format. Please use format: xxx.xxx.xxx.xxx';
        errorMsg.style.display = 'block';
        return;
      }
      
      // Generar y mostrar comando
      const command = `wget http://${ip}/content -O /tmp/content`;
      commandOutput.textContent = command;
      result.style.display = 'block';
    }
    
    // Copiar al portapapeles
    function copyToClipboard() {
      const command = commandOutput.textContent;
      navigator.clipboard.writeText(command).then(() => {
        copySuccess.style.display = 'inline';
        setTimeout(() => {
          copySuccess.style.display = 'none';
        }, 2000);
      }).catch(err => {
        alert('Failed to copy: ' + err);
      });
    }
    
    // Event listeners
    generateBtn.addEventListener('click', generateCommand);
    copyBtn.addEventListener('click', copyToClipboard);
    
    // Permitir generar con Enter
    ipInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        generateCommand();
      }
    });
  })();
</script>