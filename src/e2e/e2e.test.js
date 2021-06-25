import { Selector } from  'testcafe';
import { getMainMenuItem, getMainMenuItems, getContextMenuItems } from 'testcafe-browser-provider-electron';

fixture `Electron test`
    .page('../../build/index.html');


test('Cofirm the list of menu items', async t => {
    const menuItems = (await getMainMenuItems()).map(item => item.label);
    await t.expect(menuItems).eql(['File', 'Edit', 'View', 'Window', 'Help']);
});

test('Restore a wallet from seed', async t => {
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
        //.child('div')
        //.child('div');

    //const input_elements = restore_form.find('input');
    //console.log(`input elements: ${restore_form}`);

    await t
        .typeText(restore_form.child(0),'clinic shrug sock pumpkin cotton useful wise word solid enlist fix that')
        //.click(restore_form.child('Name'));
        .typeText(restore_form.child(1),'test_restore_seed_wallet')
        .typeText(restore_form.child(3),'password')
        .typeText(restore_form.child(5),'password')
        .click(restore_form.child('.checkbox'))
        .click(restore_form.child('.footer-step-btns').child(1));
});

test('Restore a wallet from memory', async t => {
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
        //.child('.wizard-form')
        //.child(0);
        //.child('div')
        //.child('div');

    //const input_elements = restore_form.find('input');
    //console.log(`input elements: ${restore_form}`);

    await t
        .typeText(restore_form.child(2),'password')
        .click(restore_form.child('.footer-btns').child(1));
});