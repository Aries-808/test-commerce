const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const session = require('express-session');
const multer = require('multer');

const fileStorageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './img/products')
    },
    filename: (req, file, cb) => { 
        cb(null, Date.now() + "--" + file.originalname);
    },
})

const upload = multer({ storage: fileStorageEngine });




mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database:"node_project"
})

var app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');

app.listen(8080);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({secret:"secret"}))


function isProductInCart(cart, id) { 
    for (let i = 0; i < cart.length; i++) {
        if (cart[i].id == id) {
            return true;
        }
    }
    return false;
}

function calculateTotal(cart, req) { 
    total = 0;
    for (let i = 0; i < cart.length; i++) {
        if (cart[i].sale_price) {
            total += (cart[i].sale_price * cart[i].quantity);
        }
        else {
            total += (cart[i].price * cart[i].quantity);
        }
    }
    req.session.total = total;
    return total;
}


//localhost:8080


app.get('/', function (req, res) {
    
    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database:"node_project"
    })
    
    con.query("SELECT * FROM products", (err, result)=>{
        res.render('pages/index',{result:result});
    })

});

app.get('/dashboard', function (req, res) {
    
    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database:"node_project"
    })
    
    con.query('SELECT * FROM users', (err, users) => {
        if (err) throw err;
        con.query('SELECT * FROM products', (err, products) => {
          if (err) throw err;
          con.query('SELECT * FROM orders', (err, orders) => {
            if (err) throw err;
            res.render('pages/dashboard', { users:users, products:products, orders:orders });
          });
        });
      });

});

app.post('/single', function (req, res) {
    console.log(req.file);
    res.send("Single file upload success");
});

app.post('/add_to_cart', function (req, res) {
    var id = req.body.id; 
    var name = req.body.name; 
    var description = req.body.description;
    var price = req.body.price; 
    var sale_price = req.body.sale_price; 
    var quantity = req.body.quantity;
    var image = req.body.image; 

    var product = { id: id, name: name, description:description, price: price, sale_price: sale_price, quantity: quantity, image: image };
    
    if (req.session.cart) {
        var cart = req.session.cart;

        if (!isProductInCart(cart, id)) {
            cart.push(product);
        }
    }
    else {
        req.session.cart = [product];
        var cart = req.session.cart;
    }
    
        //calculate total amount & quantity
        calculateTotal(cart, req);

        //return to cart page
        res.redirect('/cart');
    
});


app.get('/cart', function (req, res) {
    var cart = req.session.cart;
    var total = req.session.total;

    res.render('pages/cart',{cart:cart, total:total});

});

app.get('/test', function (req, res) {

    res.render('pages/test');

});

app.get('/users', function (req, res) {
    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database:"node_project"
    })
    
    con.query("SELECT * FROM users", (err, users)=>{
        res.render('pages/users',{users:users});
    })

});

app.get('/orders', function (req, res) {
    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database:"node_project"
    })
    
    con.query("SELECT * FROM orders", (err, orders)=>{
        res.render('pages/orders',{orders:orders});
    })

});

app.get('/misc', function (req, res) {

    res.render('pages/misc');
});

app.get('/productstbl', function (req, res) {

    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database:"node_project"
    })

    con.query("SELECT * FROM products", (err, products)=>{
        res.render('pages/productstbl',{products:products});
    })
});

app.post('/remove_product', function (req, res) {

    var id = req.body.id;
    var cart = req.session.cart;

    for (let i = 0; i < cart.length; i++){
        if (cart[i].id == id) {
            cart.splice(cart.indexOf(id), 1); 
        }
    }

    //recalculate
    calculateTotal(cart, req);
    res.redirect('/cart');
});

app.post('/edit_product_quantity', function (req, res) {

    var id = req.body.id;
    var quantity = req.body.quantity;
    var increase_btn = req.body.increase_product_quantity;
    var decrease_btn = req.body.decrease_product_quantity;

    var cart = req.session.cart;

    if (increase_btn) {
        for (let i = 0; i < cart.length; i++) {
            if (cart[i].id == id) {
                if (cart[i].quantity > 0) {
                    cart[i].quantity = parseInt(cart[i].quantity) + 1;
                }
            }
        }
    }

    if (decrease_btn) {
        for (let i = 0; i < cart.length; i++) {
            if (cart[i].id == id) {
                if (cart[i].quantity > 1) {
                    cart[i].quantity = parseInt(cart[i].quantity) - 1;
                }
            }
        }
    }

    calculateTotal(cart, req);
    res.redirect('/cart');
});

app.get('/checkout', function (req, res) {
    var total = req.session.total;
    res.render('pages/checkout',{total: total});
});

app.post('/place_order',function (req, res) {
    
    var name = req.body.name;
    var email = req.body.email;
    var phone = req.body.phone;
    var city = req.body.city;
    var address = req.body.address;
    var cost = req.session.total;
    var status = "not paid";
    var date = new Date();
    var products_ids = "";

    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database:"node_project"
    })

    var cart = req.session.cart;
    for (let i = 0; i < products_ids.length; i++){
        products_ids = products_ids + ',' +cart[i].id;
    }

    con.connect((err) => { 
        if (err) {
            console.log(err);
        }
        else {
            var query = "INSERT INTO orders (cost,name,email,status,city,address,phone,date,products_ids) VALUES ?";
            var values = [
                [cost, name, email, status, city, address, phone, date,products_ids]
            ];
            con.query(query, [values], (err, result) => {
                res.redirect('/payment');
            })
        }
    })
});

app.get('/payment', function (req, res) {
    res.render('pages/payment');
});


app.post('/add_product',function (req, res) {
    
    var id = req.body.id; 
    var name = req.body.name; 
    var description = req.body.description;
    var price = req.body.price; 
    var sale_price = req.body.sale_price; 
    var quantity = req.body.quantity;
    var image = req.body.image; 

    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database:"node_project"
    })

    

    con.connect((err) => { 
        if (err) {
            console.log(err);
        }
        else {
            var query = "INSERT INTO products (id,name,description,price,sale_price,quantity,image,category,type) VALUES ?";
            var values = [
                [id,name,description,price,sale_price,quantity,image,category,type]
            ];
            con.query(query, [values], (err, result) => {
                res.redirect('/productstbl');
            })
        }
    })
});
