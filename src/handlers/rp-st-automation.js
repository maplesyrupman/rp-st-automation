import * as mysql2 from 'mysql2/promise.js';
import axios from 'axios';
import {
    generateJWT,
    extractTextFromPdf,
    getSubPdfIndices,
    splitPDF,
    getCreateReportsQuery,
    uploadFileToS3,
    getPersonalAccessToken,
    getSTToken,
    uploadReportToST,
    getPreReportData,
    getReportIds, 
    getReportJsonData
} from '../utils/all.js';


export const handler = async (event, context) => {
    // exports.handler = async (event, context) => {

    const pool = mysql2.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
    let connection;
    try {
        connection = await pool.getConnection();
        const {preReportData, totalDrying} = await getPreReportData(connection)
        const reportIds = await getReportIds(connection, preReportData)
        // get transformed data from laravel endpoint 
        const reportJsonData = await getReportJsonData(reportIds)
        // console.log("reportJsonData", reportJsonData[0])

        const apiurl = 'https://us1.pdfgeneratorapi.com/api/v4/documents/generate/batch'

        // // get pdf report 
        const { data } = await axios.post(apiurl, {
            template: reportJsonData.map((report, idx) => {
                if (idx < totalDrying) {
                    return {
                        id: '389009', 
                        data: [report]
                    }
                } else {
                    return {
                        id: '425693', 
                        data: [report]
                    }
                }
            }),
            format: 'pdf',
            output: 'base64',
            name: 'test'
        },
            {
                headers: {
                    'Authorization': `Bearer ${generateJWT()}`,
                },
            },
        )

        console.log('test', data === undefined)
        // //convert base64 to stream
        const binaryData = Buffer.from(data.response, 'base64');
        const pdfBuffer = new Uint8Array(binaryData);

        const pages = await extractTextFromPdf(pdfBuffer)
        const pageType = pages.map(page => {
            return page.includes('Powered by RocketPlan Technologies') ? 'page' : 'cover'
        })

        const subPDFIndices = getSubPdfIndices(pageType)
        const splittedBuffers = await splitPDF(binaryData, subPDFIndices)//must use binaryData  
        
        console.log("number of reports: ", splittedBuffers.length)

    } catch (error) {
        console.error(JSON.stringify(error.response.data, null, 2));
    } finally {
        if (connection) {
            connection.release();
            pool.end();
        }
    }
}

//sam local invoke ScheduledEventLogger -e events/event-cloudwatch-event.json > output.txt 2>&1
