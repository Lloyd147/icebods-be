
**Affiliate Server Documentation**

**Introduction:**

Welcome to the Affiliate Server project. This server is designed to facilitate backed services to bonus9ja.



**Prerequisites:**

Node.js version 20 or higher. If you do not have Node.js installed, please visit Node.js official website for installation instructions.



**Installation:**

Clone the Repository

Begin by cloning the repository to your local machine. Use the following command in your terminal:

`git clone https://github.com/tastyjamsandwich/affiliate-server.git`



**Environment Configuration:**

After cloning the repository, set up the necessary environment variables. Create a .env file in the root directory and include the following variables with your specific values:

PORT=3000

NODE_ENV=development

CYCLIC_APP_ID="Cyclic app ID"

CYCLIC_DB="Cyclic db key"

CYCLIC_URL="Cyclic app url"

CYCLIC_BUCKET_NAME="Cyclic bucket name"

MONGO_DB="Mongo db link"

CLOUDINARY_CLOUD="Cloudinary cloud key"

CLOUDINARY_SEC_KEY="Cloudinary secret key"

CLOUDINARY_API_KEY="Cloudinary API key"

CLOUDINARY_URL="Cloudinary URL"

JWT_KEY="JWT secret key"



**Install Dependencies:**

Navigate to the project directory and install all required dependencies with the following command:

`npm install`



**Running the Server:**

Once installation is complete, start the server using the command:

`npm start`

This will launch the Affiliate Server on port 3000, making it accessible locally for development and testing purposes.
