import { Selector } from  'testcafe';
import { getMainMenuItem, getMainMenuItems, getContextMenuItems } from 'testcafe-browser-provider-electron';

fixture `Electron test`
    .page('../../build/index.html');


test.meta('name','mainMenuItems')
('Confirm the list of menu items', async t => {
    const menuItems = (await getMainMenuItems()).map(item => item.label);
    await t.expect(menuItems).eql(['File', 'Edit', 'View', 'Window', 'Help']);
});

test.meta('name','restoreSeed')
('Restore a wallet from seed', async t => {
    const restore_button = Selector('.welcome-btns')
        .child('div')
        .nth(1);

    const continue_button = Selector('.welcome-first')
        .child('.send');
  
    await t
        .click(restore_button)
        .click(continue_button);
        

    const restore_form = Selector('.restore-form')
        .child('.wizard-form')
        .child(0);

    await t
        .typeText(restore_form.child(0),'clinic shrug sock pumpkin cotton useful wise word solid enlist fix that')
        .typeText(restore_form.child(1),'test_restore_seed_wallet')
        .typeText(restore_form.child(3),'password')
        .typeText(restore_form.child(5),'password')
        .click(restore_form.child('.checkbox'))
        .click(restore_form.child('.footer-step-btns').child(1));
});

test.meta('name','restoreMemory')
('Restore a wallet from memory', async t => {
    const restore_button = Selector('.welcome-btns')
        .child('div')
        .nth(2);

    const continue_button = Selector('.welcome-first')
        .child('.send');
  
    await t
        .click(restore_button)
        .click(continue_button);
        

    const restore_form = Selector('.memory-form')
        .child('form')
        .child('div');

    await t
        .typeText(restore_form.child(2),'password')
        .click(restore_form.child('.footer-btns').child(1));
});

test.meta('name','create_fail')
('Create a new wallet - confirm incorrect seed', async t => {
    const create_button = Selector('.welcome-btns')
    .child('div')
    .nth(0);

    const continue_button = Selector('.welcome-first')
    .child('.send');

    await t
    .click(create_button)
    .click(continue_button);

    const second = Selector('.welcome-second').child('div')

    await t
        .click(second
            .nth(1)
            .child(0))
        .click(second
            .nth(2)
            .child(1));

    const restore_form = Selector('div')
            .child('form');
            //.child('div')
    await t
            .typeText(restore_form.child('.inputs-item').nth(0), 'create_wallet_name')
            .typeText(restore_form.child('.inputs-item').nth(2).child(0), 'password')
            .typeText(restore_form.child('.inputs-item').nth(3).child(0), 'password')
            .click(restore_form.child('.inputs-item').nth(4).child(0))
            .click(restore_form.child('.footer-step-btns').child(1));

     
    const nextButton = Selector('.wizard-form')
        .child('.footer-step-btns')
        .child(1);

    await t.click(nextButton);

    const backButton = Selector('.wizard-form-confirm')
        .child('.footer-step-btns')
        .child(0);
    
    await t.click(backButton);

    await t.click(nextButton);
    const nextButtonConfirm = Selector('.wizard-form-confirm')
    .child('.footer-step-btns')
    .child(1);
    await t.click(nextButtonConfirm);

    await t
        .click(nextButton)
        .click(nextButtonConfirm);
});

test.meta('name','create')
('Create a new wallet', async t => {
    const create_button = Selector('.welcome-btns')
    .child('div')
    .nth(0);

    const continue_button = Selector('.welcome-first')
    .child('.send');

    await t
    .click(create_button)
    .click(continue_button);

    const second = Selector('.welcome-second').child('div')

    await t
        .click(second
            .nth(1)
            .child(0))
        .click(second
            .nth(2)
            .child(1));

    const restore_form = Selector('div')
            .child('form');
        
    await t
            .typeText(restore_form.child('.inputs-item').nth(0), 'create_wallet_name')
            .typeText(restore_form.child('.inputs-item').nth(2).child(0), 'password')
            .typeText(restore_form.child('.inputs-item').nth(3).child(0), 'password')
            .click(restore_form.child('.inputs-item').nth(4).child(0))
            .click(restore_form.child('.footer-step-btns').child(1));

    const mywords = Selector('.wizard-form')
                    .child('form');
        
    const nextButton = Selector('.wizard-form')
        .child('.footer-step-btns')
        .child(1);

    let words_arr = [];

    for (let i=0; i<12; i++){
        let word = JSON.stringify((await t.selectText(mywords.child(i)))[0][0].data.attributes.placeholder).split(". ")[1].slice(0,-1);
        words_arr.push(word);
    }

    await t.click(nextButton);

    const checkWords = Selector('.wizard-form-confirm').child('form');
    const nextButtonConfirm = Selector('.wizard-form-confirm')
        .child('.footer-step-btns')
        .child(1);

    
    for (let i=0; i<12; i++){
        await t
            .typeText(checkWords.child(i), words_arr[i]);
    }
    
    await t.click(nextButtonConfirm); 
});

