const crypto = require('crypto');
const { argv } = require('yargs');
const { constants } = require('../constants');
const { readToken } = require('./config-utils');
const {
    getPrivateImages,
    removeImage,
    getPublicKeys,
    removePublicKey,
    updateUserProfile,
    getUserProfile
} = require('../setup/setup');

import ConfigureLinode from '../pageobjects/configure-linode';
import ListLinodes from '../pageobjects/list-linodes';
import Create from '../pageobjects/create';
import Settings from '../pageobjects/linode-detail/linode-detail-settings.page';
import LinodeDetail from '../pageobjects/linode-detail/linode-detail.page';
import NodeBalancers from '../pageobjects/nodebalancers.page';
import NodeBalancerDetail from '../pageobjects/nodebalancer-detail/details.page';

export const generatePassword = () => {
    return crypto.randomBytes(20).toString('hex');
}

export const timestamp = () => {
    if (argv.record || argv.replay) {
        global.timeCount++
        return `Unique${timeCount}`;
    }
    return `A${new Date().getTime()}`;
}

export const createGenericLinode = (label) => {
    Create.menuButton.click();
    Create.linode();
    ConfigureLinode.baseDisplay();
    ConfigureLinode.generic(label);
    ConfigureLinode.deploy.click();
    waitForLinodeStatus(label, 'running');
}

export const deleteLinode = (label) => {
    browser.url(constants.routes.linodes);
    browser.waitClick(`[data-qa-linode="${label}"] [data-qa-label]`);
    LinodeDetail.landingElemsDisplay();
    LinodeDetail.changeTab('Settings');
    Settings.remove();
}


export const createLinodeIfNone = () => {
    if (!ListLinodes.linodesDisplay()) {
        createGenericLinode(new Date().getTime());
    }
}

export const apiCreateLinode = (linodeLabel=false, privateIp=false, tags=[], type=undefined, region=undefined) => {
    const token = readToken(browser.options.testUser);
    const newLinodePass = crypto.randomBytes(20).toString('hex');
    const linode = browser.createLinode(token, newLinodePass, linodeLabel, tags, type, region);

    browser.url(constants.routes.linodes);
    browser.waitForVisible('[data-qa-add-new-menu-button]', constants.wait.normal);
    waitForLinodeStatus(linodeLabel ? linodeLabel : linode.label, 'running');

    if (privateIp) {
        linode['privateIp'] = browser.allocatePrivateIp(token, linode.id).address;
    }

    return linode;
}
 export const apiCreateMultipleLinodes = (arrayOfLinodeCreateObj) => {
    let linodes = [];
    const token = readToken(browser.options.testUser);

    arrayOfLinodeCreateObj.forEach((linodeObj) => {
        const newLinodePass = crypto.randomBytes(20).toString('hex');
        const linode = browser.createLinode(token, newLinodePass, linodeObj.linodeLabel, linodeObj.tags, linodeObj.type, linodeObj.region);
        linodes.push(linode);
    });

    browser.url(constants.routes.linodes);
    browser.waitForVisible('[data-qa-add-new-menu-button]', constants.wait.normal);

    arrayOfLinodeCreateObj.forEach((linodeObj,i) => {
        waitForLinodeStatus(linodeObj.linodeLabel ? linodeObj.linodeLabel : linodes[i].label, 'running');
        if (linodeObj.privateIp) {
            linodes[i]['privateIp'] = browser.allocatePrivateIp(token, linodes[i].id).address;
        }
    });

    return linodes;
}

export const waitForLinodeStatus = (linodeLabel, status, timeout=constants.wait.minute) => {
  browser.waitForVisible(`[data-qa-linode="${linodeLabel}"]`, timeout);
  browser.waitForVisible(`[data-qa-linode="${linodeLabel}"] [data-qa-status="${status}"]`, timeout * 3);
}

export const apiDeleteAllLinodes = () => {
    const token = readToken(browser.options.testUser);
    const removeAll = browser.removeAllLinodes(token);
    return removeAll;
}


export const apiDeleteAllVolumes = () => {
    const token = readToken(browser.options.testUser);
    browser.removeAllVolumes(token);
}

export const apiDeleteAllDomains = () => {
    const token = readToken(browser.options.testUser);
    const domains = browser.getDomains(token);
    domains.data.forEach(domain => browser.removeDomain(token, domain.id));
}

export const apiDeleteMyStackScripts = () => {
    const token = readToken(browser.options.testUser);
    const stackScripts = browser.getMyStackScripts(token);
    stackScripts.data.forEach(script => browser.removeStackScript(token, script.id));
}

export const createNodeBalancer = () => {
    const token = readToken(browser.options.testUser);
    const linode = apiCreateLinode();
    linode['privateIp'] = browser.allocatePrivateIp(token, linode.id).address;
    browser.url(constants.routes.nodeBalancers);
    NodeBalancers.baseElemsDisplay(true);
    NodeBalancers.create();
    NodeBalancers.configure(linode);
    NodeBalancerDetail.baseElemsDisplay();
}

export const removeNodeBalancers = () => {
    const token = readToken(browser.options.testUser);
    apiDeleteAllLinodes();
    const availableNodeBalancers = browser.getNodeBalancers(token);
    availableNodeBalancers.data.forEach(nb => browser.removeNodeBalancer(token, nb.id));
}

export const apiDeletePrivateImages = token => {
    const privateImages = getPrivateImages(token).data;
    privateImages.forEach(i => removeImage(token, i.id));
}

export const apiRemoveSshKeys = () => {
    const token = readToken(browser.options.testUser);
    const userKeys = getPublicKeys(token).data;

    userKeys.forEach(key => removePublicKey(token, key.id));
}

export const getProfile = () => {
    const token = readToken(browser.options.testUser);
    const profile = browser.getUserProfile(token);
    return profile;
}

export const updateProfile = (profileDate) => {
    const token = readToken(browser.options.testUser);
    const profile = browser.updateUserProfile(token,profileDate);
    return profile;
}

export const updateGlobalSettings = (settingsData) => {
    const token = readToken(browser.options.testUser);
    const settings = browser.updateGlobalSettings(token,settingsData);
    return settings;
}

export const retrieveGlobalSettings = () => {
    const token = readToken(browser.options.testUser);
    const settings = browser.getGlobalSettings(token);
    return settings;
}

export const checkEnvironment = () => {
    const environment = process.env.REACT_APP_API_ROOT;
    if (environment.includes('dev') || environment.includes('testing')) {
        pending('Feature not available in Testing or Dev environmnet');
    }
}

export const createUnattachedVolumes = (volumeObjArray) => {
    let volumes = [];
    const token = readToken(browser.options.testUser);

    volumeObjArray.forEach((volumeObj) => {
        const volume = browser.createVolumeUnattached(token,volumeObj.label,volumeObj.region,volumeObj.size,volumeObj.tags);
    });

    browser.url(constants.routes.volumes);
    browser.waitForVisible('[data-qa-add-new-menu-button]', constants.wait.normal);

    volumeObjArray.forEach((volumeObj) => {
        browser.waitForVisible(`[data-qa-volume-cell-label="${volumeObj.label}"]`, constants.wait.normal)
    });
}

export const switchTab = () => {
    browser.waitUntil(() => {
        return browser.getTabIds().length === 2;
    }, constants.wait.normal);
    browser.pause(2000);
    const tabs = browser.getTabIds();
    const manager = tabs[0];
    const newTab = tabs[1]
    browser.switchTab(newTab);
}

export const getDistrobutionLabel = (distrobutionTags) => {
    const token = readToken(browser.options.testUser);
    let distrobutionLabel = [];
    distrobutionTags.forEach((distro) => {
        const distroDetails = browser.getLinodeImage(token,distro.trim());
        distrobutionLabel.push(distroDetails.label);
    });
    return distrobutionLabel;
}

