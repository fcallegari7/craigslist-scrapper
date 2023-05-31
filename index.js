const fs = require("fs");
const fetch = require("node-fetch");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

const readConfigFileSync = (path) => {
  const text = fs.readFileSync(path, "utf-8");
  return JSON.parse(text);
};

const { brand, product, maxPrice, minPrice, postalCode, miles } =
  readConfigFileSync("./params.json");

const query = `${brand ? brand : ''} ${product ? product : ''}`.trim();

const fetchData = async () => {
  try {
    const response = await fetch(
      `https://sapi.craigslist.org/web/v8/postings/search/full?batch=16-0-360-0-0&cc=US&lang=en&max_price=${maxPrice}&min_price=${minPrice}&postal=${postalCode}&query=${query}&searchPath=sss&search_distance=${miles}&sort=date`,
      {
        referrerPolicy: "strict-origin-when-cross-origin",
        body: null,
        method: "GET",
      }
    );
  
    const {
      data: { items },
    } = await response.json();
  
    const listings = [];
  
    for (const item of items) {
      
      // exclude items without the brand or product in the title
      const itemTitle = item.at(-1).toLowerCase();
      if (brand && !itemTitle.includes(brand.toLowerCase() || product && !itemTitle.includes(product.toLowerCase()))) {
        continue;
      }
  
      listings.push({
        title: item.at(-1),
        price: item[3],
      });
    }
  
    return listings;
  } catch (error) {
    throw new Error(`Error fetching craigslist api. ${error}`);
  }
};

const buildEmailMarkup = (listings) => {
  const listingMarkup = ({ title, price }) => `
  <h4>${title}</h4>
  <p style="padding-bottom: 10px;border-bottom: 1px solid grey">Price: <b>$${price}</b></p>
`;

  const markup = `
  <h1>Craigslist Listings for ${query}</h1>
  ${listings.map((listing) => listingMarkup(listing)).join("")}
`;

  return markup;
};

const sendEmail = (listings) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SENDER_EMAIL,
      pass: process.env.SENDER_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.SENDER_EMAIL,
    to: process.env.RECIPIENT_EMAIL,
    subject: `Craiglist listings for "${query}"`,
    html: buildEmailMarkup(listings),
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

const main = async () => {
  const listings = await fetchData();
  sendEmail(listings);
};

main();
