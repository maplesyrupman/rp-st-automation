const libphonenumber = require('google-libphonenumber');
const PNF = libphonenumber.PhoneNumberFormat;
const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();

function formatContentForCoverPageAndClaims(jsonStructure) {
    console.log('jsonStructure', jsonStructure);

    if (jsonStructure.projects?.[0]?.company?.phones?.[0]) {
        const phone = jsonStructure.projects[0].company.phones[0];
        try {
            const number = phoneUtil.parseAndKeepRawInput(phone.value, phone.country_alpha_2 || 'US');
            jsonStructure.projects[0].company.phone_formatted = phoneUtil.format(number, PNF.NATIONAL);
        } catch (error) {
            jsonStructure.projects[0].company.phone_formatted = '';
        }
    }

    if (jsonStructure.projects?.[0]?.company?.address) {
        const address = jsonStructure.projects[0].company.address;
        const formattedAddress = `${address.address}${address.address_2 ? "\n" + address.address_2 : ''}\n${address.city}, ${address.state}${(address.country === 'United States' || address.country === 'United States of America') ? '' : ', ' + address.country}`;
        jsonStructure.projects[0].company.address_formatted = formattedAddress;
        jsonStructure.projects[0].company.name_and_address = `${jsonStructure.projects[0].company.name}\n\n${formattedAddress}${jsonStructure.projects[0].company.website ? "\n\n" + jsonStructure.projects[0].company.website : ''}${jsonStructure.projects[0].company.phone_formatted ? (jsonStructure.projects[0].company.website ? "\n" : "\n\n") + jsonStructure.projects[0].company.phone_formatted : ''}`;
    }

    jsonStructure.table = jsonStructure.table || [];

    if (jsonStructure.projects?.[0]?.creator) {
        jsonStructure.table.push({
            label: 'Project Manager',
            value: jsonStructure.projects[0].creator.full_name
        });
    }

    if (jsonStructure.projects?.[0]?.creator?.phones?.[0]) {
        const pm_phone = jsonStructure.projects[0].creator.phones[0];
        try {
            const number = phoneUtil.parseAndKeepRawInput(pm_phone.value, pm_phone.country_alpha_2 || 'US');
            jsonStructure.table.push({
                label: 'Cell Phone #',
                value: phoneUtil.format(number, PNF.NATIONAL)
            });
        } catch (error) {}
    }

    if (jsonStructure.projects?.[0]?.claims?.[0]?.claim_number) {
        jsonStructure.table.push({
            label: 'Claim #',
            value: jsonStructure.projects[0].claims[0].claim_number
        });
    }

    if (jsonStructure.projects?.[0]?.uid) {
        jsonStructure.table.push({
            label: 'Our File #',
            value: jsonStructure.projects[0].uid
        });
    }

    if (jsonStructure.projects?.[0]?.claims?.[0]?.policy_number) {
        jsonStructure.table.push({
            label: 'Policy #',
            value: jsonStructure.projects[0].claims[0].policy_number
        });
    }

    let timezone;
    try {
        timezone = jsonStructure.projects?.[0]?.company?.timezone;
    } catch (e) {
        timezone = process.env.TIMEZONE || 'UTC'; //change to correct timezone 
    }
    if (jsonStructure.projects?.[0]?.properties?.[0]?.loss_date) {
        const date = new Date(jsonStructure.projects[0].properties[0].loss_date);
        jsonStructure.loss_date = {
            label: 'Date of Loss',
            value: date.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })
        };
    }

    return jsonStructure;
}

module.exports = formatContentForCoverPageAndClaims;