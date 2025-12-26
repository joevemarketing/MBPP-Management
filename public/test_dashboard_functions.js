// Dashboard Button Functionality Test Script
// This script tests all main dashboard functions

console.log('🧪 Starting Dashboard Functionality Tests...');

// Wait for page to load completely
window.addEventListener('load', () => {
    setTimeout(() => {
        console.log('📋 Testing all buttons and functions...');
    
    // Test 1: Theme Toggle Button
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        console.log('✅ Theme Toggle Button: FOUND');
        
        // Test click
        const initialTheme = document.documentElement.classList.contains('light') ? 'light' : 'dark';
        themeToggle.click();
        setTimeout(() => {
            const newTheme = document.documentElement.classList.contains('light') ? 'light' : 'dark';
            if (newTheme !== initialTheme) {
                console.log('✅ Theme Toggle: WORKING - Theme changed from', initialTheme, 'to', newTheme);
            } else {
                console.log('❌ Theme Toggle: NOT WORKING');
            }
        }, 100);
    } else {
        console.log('❌ Theme Toggle Button: NOT FOUND');
    }
    
    // Test 2: Download PDF Button
    const downloadPdfBtn = document.getElementById('downloadPdf');
    if (downloadPdfBtn) {
        console.log('✅ Download PDF Button: FOUND');
        console.log('✅ Download PDF Button: READY - Manual click required to test actual download');
    } else {
        console.log('❌ Download PDF Button: NOT FOUND');
    }
    
    // Test 3: Logout Button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        console.log('✅ Logout Button: FOUND');
        console.log('✅ Logout Button: READY - Manual click required to test redirect');
    } else {
        console.log('❌ Logout Button: NOT FOUND');
    }
    
    // Test 4: Add Contractor Button
    const addContractorBtn = document.getElementById('addContractorBtn');
    const contractorModal = document.getElementById('contractorManageModal');
    if (addContractorBtn && contractorModal) {
        console.log('✅ Add Contractor Button & Modal: FOUND');
        
        // Test modal opening
        addContractorBtn.click();
        setTimeout(() => {
            if (contractorModal.classList.contains('show')) {
                console.log('✅ Add Contractor Modal: OPENS correctly');
                
                // Test modal close
                const modalBackdrop = document.getElementById('modalBackdrop');
                if (modalBackdrop) {
                    modalBackdrop.click();
                    setTimeout(() => {
                        if (!contractorModal.classList.contains('show')) {
                            console.log('✅ Add Contractor Modal: CLOSES correctly');
                        } else {
                            console.log('❌ Add Contractor Modal: DOES NOT CLOSE on backdrop click');
                        }
                    }, 100);
                }
            } else {
                console.log('❌ Add Contractor Modal: DOES NOT OPEN');
            }
        }, 100);
    } else {
        console.log('❌ Add Contractor Button or Modal: NOT FOUND');
    }
    
    // Test 5: Add Vehicle Button
    setTimeout(() => {
        const addVehicleBtn = document.getElementById('addVehicleBtn');
        const vehicleModal = document.getElementById('vehicleManageModal');
        if (addVehicleBtn && vehicleModal) {
            console.log('✅ Add Vehicle Button & Modal: FOUND');
            
            // Test modal opening
            addVehicleBtn.click();
            setTimeout(() => {
                if (vehicleModal.classList.contains('show')) {
                    console.log('✅ Add Vehicle Modal: OPENS correctly');
                    
                    // Test contractor dropdown is populated
                    const vContractor = document.getElementById('vContractor');
                    if (vContractor && vContractor.options.length > 1) {
                        console.log('✅ Add Vehicle Modal: Contractor dropdown is POPULATED');
                    } else {
                        console.log('❌ Add Vehicle Modal: Contractor dropdown is EMPTY');
                    }
                    
                    // Close modal
                    const modalBackdrop = document.getElementById('modalBackdrop');
                    if (modalBackdrop) {
                        modalBackdrop.click();
                    }
                } else {
                    console.log('❌ Add Vehicle Modal: DOES NOT OPEN');
                }
            }, 200);
        } else {
            console.log('❌ Add Vehicle Button or Modal: NOT FOUND');
        }
    }, 500);
    
    // Test 6: Create Task Button
    setTimeout(() => {
        const createTaskBtn = document.getElementById('createTaskBtn');
        const taskModal = document.getElementById('taskManageModal');
        if (createTaskBtn && taskModal) {
            console.log('✅ Create Task Button & Modal: FOUND');
            
            // Test modal opening
            createTaskBtn.click();
            setTimeout(() => {
                if (taskModal.classList.contains('show')) {
                    console.log('✅ Create Task Modal: OPENS correctly');
                    
                    // Test form elements exist
                    const tTitle = document.getElementById('tTitle');
                    const tPriority = document.getElementById('tPriority');
                    const tVehicle = document.getElementById('tVehicle');
                    const tContractor = document.getElementById('tContractor');
                    
                    if (tTitle && tPriority && tVehicle && tContractor) {
                        console.log('✅ Create Task Modal: All form elements FOUND');
                    } else {
                        console.log('❌ Create Task Modal: Missing form elements');
                    }
                    
                    // Close modal
                    const modalBackdrop = document.getElementById('modalBackdrop');
                    if (modalBackdrop) {
                        modalBackdrop.click();
                    }
                } else {
                    console.log('❌ Create Task Modal: DOES NOT OPEN');
                }
            }, 200);
        } else {
            console.log('❌ Create Task Button or Modal: NOT FOUND');
        }
    }, 800);
    
    // Test 7: Escape Key Handler
    setTimeout(() => {
        console.log('🧪 Testing ESC key handler...');
        
        // Open a modal first
        const addContractorBtn = document.getElementById('addContractorBtn');
        if (addContractorBtn) {
            addContractorBtn.click();
            
            setTimeout(() => {
                // Test ESC key
                const escEvent = new KeyboardEvent('keydown', {
                    key: 'Escape',
                    code: 'Escape',
                    keyCode: 27
                });
                document.dispatchEvent(escEvent);
                
                setTimeout(() => {
                    const contractorModal = document.getElementById('contractorManageModal');
                    if (contractorModal && !contractorModal.classList.contains('show')) {
                        console.log('✅ ESC Key Handler: WORKS');
                    } else {
                        console.log('❌ ESC Key Handler: NOT WORKING');
                    }
                }, 100);
            }, 100);
        }
    }, 1200);
    
    // Summary
    setTimeout(() => {
        console.log('📊 Test Summary Complete!');
        console.log('📝 Manual Tests Still Required:');
        console.log('  • Form validation (empty submissions)');
        console.log('  • API calls (with proper authentication)');
        console.log('  • PDF download functionality');
        console.log('  • Logout redirect');
    }, 2000);
        
    });
}, 1000);