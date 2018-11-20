
const validator = require('validator'),
 nodemailer = require('nodemailer');


var mgTransport = require('nodemailer-mailgun-transport'); 
var mailgunTransport = nodemailer.createTransport(mgTransport({
  auth: {
    api_key: sails.config.MAILGUN_KEY,
    domain: 'mg.raidparty.io'
  }
}));



/** Mandrill Transport Method */
var mTransport = require('nodemailer-mandrill-transport');
var mandrillTransport = nodemailer.createTransport(mTransport({
  auth: {
    apiKey: sails.config.MANDRILL_KEY
  }
}));


/** Default SMTP Transport Method */
var smtpTransport = require('nodemailer-smtp-transport');
var defaultTransport = nodemailer.createTransport(smtpTransport({
  //host: sails.config.smtpHost || 'localhost',
  port: sails.config.SMTP_PORT || '25',
  secure: sails.config.SMTP_SECURE || false,
  tls: {rejectUnauthorized: false}
  /*
   auth: {
   user: sails.config.smtpUser || '',
   pass: sails.config.smtpPass || ''
   },
   */
  //debug: true
}));

module.exports = {
  /**
   * @type {{sendEmail: Function}}
   * @param {object} opts
   * @param opts.fromEmail - array of emails or a valid email address or only username e.g. support@example.com or support only
   * @param opts.fromName
   * @param opts.toEmail
   * @param opts.toName
   * @param opts.subject
   * @param opts.body
   * @param [opts.cc]
   * @param [opts.bcc]
   * @param [opts.inReply]
   * @param [opts.headers]
   * @returns {Promise.<>}
   */
  sendEmail: function(opts){
    let {fromEmail,fromName,toEmail,toName,subject,body,cc,bcc,inReply,headers} = opts;

    fromEmail = translateToEmail(fromEmail);


    !fromEmail.length && fromEmail.push('support@' + sails.config.MAILER);

    return new sails.bluebird(function(resolve,reject){


      // if(typeof transporter === 'undefined' || transporter.length == 0){
      //   // Create a normal transport object - will probably fail delivery. Should use SMTP
      //   transporter = nodemailer.createTransport();
      // }


      // Make sure required params are provided
      if(typeof fromEmail === 'undefined' || fromEmail.length == 0){
        return reject('fromEmail must be provided');
      }

      // Make sure a fromName is provided
      if(typeof fromName === 'undefined' || fromName.length == 0){
        return reject('fromName must be provided');
      }


      // Make sure a subject is provided
      if(typeof subject === 'undefined' || subject.length == 0){
        return reject('subject must be provided');
      }


      // Uses npm sanitize-html
      let plainTextBody = require('sanitize-html') (body,{allowedTags: []});

      sails.log('sending to ', toEmail);
      // Message object
      var messageOptions = {

        // sender info
        from: fromName + '<' + fromEmail + '>',

        // Comma separated list of recipients
        to: toName + '<'+toEmail+'>',

        // Subject of the message
        subject: subject,

        // plaintext body
        text: plainTextBody,

        // HTML body
        html: body,

        //unComment to test the attachment with reply email
        //
        // attachments: [
        //   {   // utf-8 string as an attachment
        //     filename: 'file1.doc',
        //     content: 'This is my Lifetime'
        //   },
        //   {   // binary buffer as an attachment
        //     filename: 'file2.doc',
        //     content: new Buffer('hello world!','utf-8')
        //   },
        //
        //   // {   // use URL as an attachment
        //   //   filename: 'license.txt',
        //   //   path: 'https://raw.github.com/nodemailer/nodemailer/master/LICENSE'
        //   // }
        // ]



      };

      if(inReply){
        messageOptions.inReplyTo = inReply;
      }

      if(headers){
        messageOptions.headers=headers;
      }

       switch(sails.config.environment){
      
          case 'production':
            mailgunTransport.sendMail(messageOptions, function(err, info){
              if(err){
                return reject(err);
              }

              return resolve(info);
            });
            break;
          default:
           mailgunTransport.sendMail(messageOptions, function(err, info){
             if(err){
                 return reject(err);
               }
        
               return resolve(info);
             });
           break;
        }

    });


  }
};

function translateToEmail(emails, dontChangeDomain){
  let rsp = [];
  if(!_.isArray(emails)) emails = [emails];

  if(dontChangeDomain)
    return emails.filter(validator.isEmail);

  emails.forEach((fEmail)=>{
    if(!_.isString(fEmail))
      return;
    if(validator.isEmail(fEmail)){
      fEmail = fEmail.split("@")[0];
    }

    fEmail = fEmail + '@' + sails.config.MAILER;
    validator.isEmail(fEmail) && rsp.push(fEmail);
  });
  return rsp;
}
