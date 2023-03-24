const express = require("express");
const sqlite3 = require("sqlite3");
const path = require("path");
var format = require("date-fns/format");
var isValid = require("date-fns/isValid");
const parse = require("date-fns/parse");
const { open } = require("sqlite");
// const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "todoApplication.db");
let db;
// const secret_token = "awDEklIE_dselOOne_serc";

(async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server started at port: 3000");
    });
  } catch (error) {
    console.log(error.message);
  }
})();

// transforming todo object utility function
const transObjToNewObj = (obj) => {
  return {
    ...obj,
    dueDate: obj.due_date,
    due_date: undefined,
  };
};

// table schema
// id	        INTEGER
// todo	        TEXT
// category	   TEXT
// priority	   TEXT
// status	   TEXT
// due_date	   DATE

// Possible query values, values other than this are false
const categoryValues = ["WORK", "HOME", "LEARNING"];
const priorityValues = ["HIGH", "MEDIUM", "LOW"];
const statusValues = ["TO DO", "IN PROGRESS", "DONE"];

// functions that checks weather query values are valid or not
const isDateValid = (date) => {
  const parsedDate = parse(date, "yyyy-MM-dd", new Date());
  if (date !== undefined && isValid(parsedDate) === true) {
    return true;
  }
  return "Invalid Due Date";
};
const checkValidStatusReq = (status) =>
  status !== undefined && statusValues.includes(status)
    ? true
    : "Invalid Todo Status";
const checkValidPriorityReq = (priority) =>
  priority !== undefined && priorityValues.includes(priority)
    ? true
    : "Invalid Todo Priority";
const checkValidCategoryReq = (category) =>
  category !== undefined && categoryValues.includes(category)
    ? true
    : "Invalid Todo Category";

// API ----- 1
// Get request based on given scenarios
app.get("/todos/", async (req, res) => {
  let errResponseMsg, getTodoQuery;
  let errorCOde = 400;
  const { status, priority, search_q = "", category } = req.query;
  const validStatus = checkValidStatusReq(status);
  const validPriority = checkValidPriorityReq(priority);
  const validCategory = checkValidCategoryReq(category);

  //   check for scenarios..
  switch (true) {
    //   scenario-1
    case status !== undefined && priority !== undefined:
      if (validStatus !== true) {
        errResponseMsg = validStatus;
      } else if (validPriority !== true) {
        errResponseMsg = validPriority;
      } else {
        getTodoQuery = `SELECT * FROM todo WHERE
                status='${status}' AND priority='${priority}' AND todo LIKE '%${search_q}%'
                ORDER BY id;`;
      }
      break;

    //   scenario-2
    case category !== undefined && status !== undefined:
      if (validCategory !== true) {
        errResponseMsg = validCategory;
      } else if (validStatus !== true) {
        errResponseMsg = validStatus;
      } else {
        getTodoQuery = `SELECT * FROM todo WHERE status='${status}' AND category = '${category}'
          AND todo LIKE '%${search_q}%' ORDER BY id;`;
      }
      break;

    //   scenario-3
    case category !== undefined && priority !== undefined:
      if (validCategory !== true) {
        errResponseMsg = validCategory;
      } else if (validPriority !== true) {
        errResponseMsg = validPriority;
      } else {
        getTodoQuery = `SELECT * FROM todo WHERE category = '${category}' AND priority='${priority}'
              AND todo LIKE '%${search_q}%' ORDER BY id;`;
      }
      break;

    //   scenario-4
    case status !== undefined:
      if (validStatus !== true) {
        errResponseMsg = validStatus;
      } else {
        getTodoQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND  status = '${status}'
             ORDER BY id;`;
      }
      break;

    //   scenario-5
    case priority !== undefined:
      if (validPriority !== true) {
        errResponseMsg = validPriority;
      } else {
        getTodoQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND  priority = '${priority}'
             ORDER BY id;`;
      }
      break;

    //   scenario-6
    case category !== undefined:
      if (validCategory !== true) {
        errResponseMsg = validCategory;
      } else {
        getTodoQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND  category = '${category}'
             ORDER BY id;`;
      }
      break;

    //   scenario-7
    default:
      getTodoQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%' ORDER BY id;`;
      break;
  }

  //_________//
  // check if there is an error response, else continue to fetch data
  if (errResponseMsg) {
    res.status(errorCOde);
    res.send(errResponseMsg);
  } else {
    let todoArr = await db.all(getTodoQuery);
    todoArr = todoArr.map((obj) => transObjToNewObj(obj));
    res.send(todoArr);
  }
});

// API----2
// Get todo based on todo id
app.get("/todos/:Id", async (req, res) => {
  const todoId = req.params.Id;
  const getTodoQuery = `SELECT * FROM todo WHERE id = ${todoId};`;
  const todoObj = await db.get(getTodoQuery);
  const todoItem = await todoObj;
  res.send(transObjToNewObj(todoItem));
});

// API ---- 3
// todo objects with a specific due date in the query parameter
app.get("/agenda/", async (req, res) => {
  let { date } = req.query;
  const isValidDate = isDateValid(date);

  if (isValidDate === true) {
    date = format(new Date(date), "yyyy-MM-dd");
    const getTodoQuery = `SELECT * FROM todo WHERE due_date = '${date}';`;
    let todoArr = await db.all(getTodoQuery);
    // const todoItem = await todoObj;
    todoArr = todoArr.map((obj) => transObjToNewObj(obj));
    res.send(todoArr);
  } else {
    res.status(400);
    res.send(isValidDate);
  }
});

//API ---- 4
// Posting new todo into db
app.post("/todos/", async (req, res) => {
  const todo = req.body;

  //check if todo already exists or not
  const getTodo = `SELECT * FROM todo WHERE id = ${todo.id};`;
  const todoItem = await db.get(getTodo);

  if (todoItem) {
    res.send("Todo Already Exists.");
  } else {
    let statusCode = 400;
    let respMsg;

    //checking for correct todo inputs
    const isValidPriority = checkValidPriorityReq(todo.priority);
    const isValidStatus = checkValidStatusReq(todo.status);
    const isValidCategory = checkValidCategoryReq(todo.category);
    const isValidDate = isDateValid(todo.dueDate);

    console.log(isValidPriority);
    console.log(isValidStatus);
    console.log(isValidCategory);
    console.log(isValidDate);

    if (isValidPriority !== true) {
      respMsg = isValidPriority;
    } else if (isValidStatus !== true) {
      respMsg = isValidStatus;
    } else if (isValidCategory !== true) {
      respMsg = isValidCategory;
    } else if (isValidDate !== true) {
      respMsg = isValidDate;
    } else {
      respMsg = "Todo Successfully Added";
      statusCode = 200;
    }

    if (statusCode === 200) {
      const addNewTodo = `INSERT INTO todo 
                    (id, todo, priority, status, category, due_date) 
                    VALUES (?, ?, ?, ?, ?, ?);`;
      await db.run(addNewTodo, [
        todo.id,
        todo.todo,
        todo.priority,
        todo.status,
        todo.category,
        todo.dueDate,
      ]);
      res.send(respMsg);
    } else {
      res.status(statusCode);
      res.send(respMsg);
    }
  }
});

//API ---- 5
// updating the db
app.put("/todos/:Id", async (req, res) => {
  try {
    const todoId = req.params.Id;
    const bodyObj = req.body;
    let [todoKey] = Object.keys(bodyObj);
    const todoValue = bodyObj[todoKey];
    let statusCode = 200;
    let responseMsg;

    switch (todoKey) {
      case "todo":
        responseMsg = "Todo Updated";
        break;
      case "status":
        const isValidStatus = checkValidStatusReq(todoValue);
        if (isValidStatus === true) {
          responseMsg = "Status Updated";
        } else {
          responseMsg = isValidStatus;
          statusCode = 400;
        }
        break;
      case "priority":
        const isValidPriority = checkValidPriorityReq(todoValue);
        if (isValidPriority === true) {
          responseMsg = "Priority Updated";
        } else {
          responseMsg = isValidPriority;
          statusCode = 400;
        }
        break;
      case "category":
        const isValidCategory = checkValidCategoryReq(todoValue);
        if (isValidCategory === true) {
          responseMsg = "Category Updated";
        } else {
          responseMsg = isValidCategory;
          statusCode = 400;
        }
        break;
      case "dueDate":
        todoKey = "due_date";
        const isValidDueDate = isDateValid(todoValue);
        if (isValidDueDate === true) {
          responseMsg = "Due Date Updated";
        } else {
          responseMsg = isValidDueDate;
          statusCode = 400;
        }
        break;

      default:
        responseMsg = "Incorrect body object";
        break;
    }

    const updateTodoQuery = `UPDATE todo SET ${todoKey} = '${todoValue}' WHERE id = ${todoId};`;
    await db.run(updateTodoQuery);
    res.status(statusCode);
    res.send(responseMsg);
  } catch (error) {
    console.log(error.message);
  }
});

// API----6
// Deleting todo with given Id
app.delete("/todos/:Id", async (req, res) => {
  const todoId = req.params.Id;
  const delTodoQuery = `DELETE FROM todo WHERE id = ${todoId};`;
  await db.run(delTodoQuery);
  res.send("Todo Deleted");
});

module.exports = app;
