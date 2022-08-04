import React, { ChangeEvent } from "react";
import * as yup from "yup";
export const FormDemo = () => {
  /**
  * 
   const schema = yup.object().shape({
    name: yup.string().required(),
    age: yup.number().required().positive().integer(),
    email: yup.string().email(),
    website: yup.string().url(),
    createdOn: yup.date().default(function () {
      return new Date();
    }),
  });
  schema
    .validate({
      name: 'null',
      age: null,
    })
    .catch(function (err) {
      console.log(err);
    });
  const ageSchema = yup.number().lessThan(10);
  ageSchema.validate(9).catch((err) => {
    console.log('age:', error);
  });
  const singleValidate = yup.object({
    name: yup.string().required(),
    age: yup.number().positive(),
    email: yup.string().email(),
  });
  // 使用这种方式对的shema进行验证
  console.log(
    'schema: ',
    singleValidate.isValidSync({name: 'dsaas'}),
    singleValidate.isValidSync({age: 's'}),
    singleValidate.isValidSync({email: 's'})
  );
  */
  const formSchema = yup.object({
    name: yup.string().required(),
    age: yup.number().required().positive().min(10).max(50),
    address: yup.string().required().min(6).max(10),
    phone: yup
      .string()
      .required()
      .test(
        "isPhone",
        // 错误信息
        "${value} is not in the server",
        // '${path} is not in the server',
        async (phone) => {
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              const isValiadte = Math.random() < 0.5;
              resolve(isValiadte);
            }, 2000);
          });
        }
      ),
    date: yup.object({
      start: yup.date().nullable().notRequired(),
      end: yup
        .date()
        .nullable()
        .notRequired()
        .when("start", {
          is: (value) => !!value,
          then: yup.date().min(yup.ref("start")),
        }),
    }),
    amount: yup.object().shape(
      {
        start: yup
          .number()
          .transform((val) => {
            console.log("start transform ", value);
            return val ? Number(val) : undefined;
          })
          .nullable(true)
          .min(0)
          .max(10),
        // .when('start', {
        //   is: (value) => value !== undefined && value !== null,
        //   then: (rule) => {
        //     console.log('start then --- 0');
        //     return yup.number().min(10);
        //   },
        // })
        // .when('start', {
        //   is: (value) => value !== undefined && value !== null,
        //   then: (rule) => {
        //     console.log('start then ---- 1');
        //     return yup.number().min(2);
        //   },
        // }),
        end: yup
          .number()
          .when("start", {
            is: (start) => {
              // 判断 start 存在的时候
              // console.log('end when', start);
              return start !== undefined && start !== null;
            },
            then: (rule) => {
              // start 存在值的时候
              console.log("end rule", rule);
              return rule.required().min(yup.ref("start"));
            },
            otherwise: (rule) => {
              // start 不存在值的时候
              return rule.test(
                "isStartEmpty",
                "不能只填写 start Amount",
                (end) => {
                  // 但是当前的 end 存在值
                  return !(end !== undefined && end !== null);
                }
              );
            },
          })
          // transform 函数无论放在哪里，好像都会第一个执行
          .transform((val) => {
            console.log("end transform ", value);
            return val ? Number(val) : undefined;
          }),
      },
      // https://so.muouseo.com/qa/ky6qq9zqo6vz.html
      [["start", "start"]]
    ),
  });

  const { verify, value, setValue, verifying, errorMsg, submit, submitting } =
    useForm({
      initialValue: {
        name: "ztl",
        age: 18,
        address: "",
        phone: "",
        date: {
          end: "",
          start: "",
        },
        amount: {
          start: "",
          end: "",
        },
      },
      schema: formSchema,
      async onSubmit(value) {
        console.log(value);
      },
      validation: {
        name: (name, formValue) => {
          console.log("formValue", formValue);
          return !name ? "name必须存在" : null;
        },
        age: [
          (age, formValue) => {
            return age > 18 ? null : "age必须大于18";
          },
          (age, formValue) => {
            return age < 50 ? null : "age必须小于50";
          },
          async (age, formValue) => {
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve(null);
                console.log("验证完成");
              }, 3000);
            });
          },
        ],
        address: [
          (address, formValue) => {
            console.log("address", address);
            return !address ? " address 必须存在" : null;
          },
          async (address, formValue) => {
            return new Promise<string>((resolve, reject) => {
              setTimeout(() => {
                if (address.length < 6) {
                  reject("当前的 address 不存在");
                } else {
                  resolve("");
                }
              }, 4 * 1000);
            }).catch((error) => {
              return error;
            });
          },
        ],
      },
    });

  return (
    <div style={{ padding: 20 }}>
      <h4>Form</h4>
      <form>
        <Label>
          name:
          <input
            value={value.name}
            onChange={(event: ChangeEvent) => {
              setValue({ name: event.currentTarget?.value || "" });
            }}
            onBlur={() => {
              verify("name");
            }}
          />
          <div> verifying: {`${verifying.name}`}</div>
        </Label>
        <Label>
          age:
          <input
            type="number"
            value={value.age}
            onBlur={() => {
              verify("age");
            }}
            onChange={(event: ChangeEvent) => {
              setValue({ age: parseInt(event.currentTarget?.value) || 0 });
            }}
          />
          <div> verifying: {`${verifying.age}`}</div>
        </Label>

        <Label>
          address:
          <input
            type="textarea"
            value={value.address}
            onBlur={() => {
              verify("address");
            }}
            onChange={(event: ChangeEvent) => {
              setValue({ address: event.currentTarget?.value || "" });
            }}
          />
          <div> verifying: {`${verifying.address}`}</div>
        </Label>
        <Label>
          phone:
          <input
            value={value.phone}
            onBlur={() => {
              verify("phone");
            }}
            onChange={(event: ChangeEvent) => {
              setValue({ phone: event.currentTarget?.value || "" });
              verify("phone");
            }}
          />
          <div> verifying: {`${verifying.phone}`}</div>
        </Label>

        <Label>
          date:
          <br></br>
          start:
          <input
            type="date"
            value={value.date.start}
            onBlur={() => {}}
            onChange={(event: ChangeEvent) => {
              setValue({
                date: {
                  ...value.date,
                  start: event.currentTarget?.value,
                },
              });
              verify("date");
            }}
          />
          end:
          <input
            type="date"
            value={value.date.end}
            onBlur={() => {}}
            onChange={(event: ChangeEvent) => {
              setValue({
                date: {
                  ...value.date,
                  end: event.currentTarget?.value,
                },
              });
              verify("date");
            }}
          />
          <div> verifying: {`${verifying.date}`}</div>
        </Label>

        <Label>
          Amount :
          <br />
          start:
          <input
            value={value.amount.start}
            onBlur={() => {
              verify("amount");
            }}
            onChange={(event: ChangeEvent) => {
              setValue({
                amount: {
                  ...value.amount,
                  start: event.currentTarget.value,
                },
              });
              verify("amount");
            }}
          />
          end:
          <input
            value={value.amount.end}
            onBlur={() => {
              // verify('amount');
            }}
            onChange={(event: ChangeEvent) => {
              setValue({
                amount: {
                  ...value.amount,
                  end: event.currentTarget?.value,
                },
              });
              verify("amount");
            }}
          />
          <div> verifying: {`${verifying.phone}`}</div>
        </Label>
      </form>
      <p> value: {JSON.stringify(value)}</p>
      <div>
        <button
          onClick={() => {
            verify("age");
          }}
        >
          验证年龄
        </button>

        <button
          onClick={() => {
            verify("name");
          }}
        >
          验证姓名
        </button>
        <button onClick={submit}>submit</button>
      </div>
      <div>submitting: {submitting + ""}</div>
      <div>errorMessage: {JSON.stringify(errorMsg)}</div>
    </div>
  );
};

const Label = styled.label`
  display: block;
  margin-bottom: 20px;
`;
