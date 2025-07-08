#include <iostream>
#include <stack>
#include <cmath>
#include <cctype>
#include <string>

using namespace std;

int prec(char op) {
    if (op == '~') {
        return 3;
    }
    if (op == '^') {
        return 4;
    }
    if (op == '*' || op == '/' || op == '%') {
        return 2;
    }
    if (op == '+' || op == '-') {
        return 1;
    }
    return 0;
}

bool isRightAssociative(char op) {
    return op == '^';
}

bool applyOperator(stack<double>& operands, stack<char>& operators) {
    if (operators.empty()) {
        return false;
    }
    char op = operators.top();
    operators.pop();

    if (op == '~') {
        if (operands.empty()) {
            return false;
        }
        double a = operands.top();
        operands.pop();
        operands.push(-a);
        return true;
    }

    if (operands.size() < 2) {
        return false;
    }
    double b = operands.top(); operands.pop();
    double a = operands.top(); operands.pop();

    switch (op) {
        case '^':
            operands.push(pow(a, b));
            break;
        case '*':
            operands.push(a * b);
            break;
        case '/':
            if (b == 0) {
                return false;
            }
            operands.push(a / b);
            break;
        case '%':
            operands.push(fmod(a, b));
            break;
        case '+':
            operands.push(a + b);
            break;
        case '-':
            operands.push(a - b);
            break;
        default:
            return false;
    }
    return true;
}

double evaluate(string expr, bool& error) {
    stack<double> operands;
    stack<char> operators;
    bool allowUnary = true;
    error = false;

    for (int i = 0; i < expr.length(); i++) {
        if (isdigit(expr[i])) {
            long num = 0;
            int j = i;
            while (j < expr.length() && isdigit(expr[j])) {
                num = num * 10 + (expr[j] - '0');
                j++;
            }
            i = j - 1;
            operands.push(static_cast<double>(num));
            allowUnary = false;
        } else if (expr[i] == '(') {
            operators.push('(');
            allowUnary = true;
        } else if (expr[i] == ')') {
            while (!operators.empty() && operators.top() != '(') {
                if (!applyOperator(operands, operators)) {
                    error = true;
                    return 0;
                }
            }
            if (operators.empty()) {
                error = true;
                return 0;
            }
            operators.pop();
            allowUnary = false;
        } else if (expr[i] == '-' && allowUnary) {
            operators.push('~');
            allowUnary = true;
        } else {
            char op = expr[i];
            while (!operators.empty() && operators.top() != '(') {
                char topOp = operators.top();
                if (prec(topOp) > prec(op) || 
                    (prec(topOp) == prec(op) && !isRightAssociative(op))) {
                    if (!applyOperator(operands, operators)) {
                        error = true;
                        return 0;
                    }
                } else {
                    break;
                }
            }
            operators.push(op);
            allowUnary = true;
        }
    }

    while (!operators.empty()) {
        if (operators.top() == '(') {
            error = true;
            return 0;
        }
        if (!applyOperator(operands, operators)) {
            error = true;
            return 0;
        }
    }

    if (operands.size() != 1) {
        error = true;
        return 0;
    }

    return operands.top();
}

int main() {
    string input, sol;
    getline(cin, input);
getline(cin, sol);


    string inputDigits = "";
    for (char c : input) {
        if (isdigit(c)) {
            inputDigits += c;
        }
    }

    string solDigits = "";
    for (char c : sol) {
        if (isdigit(c)) {
            solDigits += c;
        }
    }

    if (inputDigits != solDigits) {
        cout << "invalid" << endl;
        return 0;
    }

    stack<char> brackets;
    for (char c : sol) {
        if (c == '(') {
            brackets.push(c);
        } else if (c == ')') {
            if (brackets.empty()) {
                cout << "invalid" << endl;
                return 0;
            }
            brackets.pop();
        }
    }
    if (!brackets.empty()) {
        cout << "invalid" << endl;
        return 0;
    }

    for (char c : sol) {
        if (isdigit(c)) continue;
        if (c == '+' || c == '-' || c == '*' || c == '/' || c == '%' || c == '^' || c == '(' || c == ')') {
            continue;
        }
        cout << "invalid" << endl;
        return 0;
    }

    bool error = false;
    double result = evaluate(sol, error);
    cout << "[DEBUG] Evaluated result = " << result << endl;

    if (error || abs(result - 100.0) > 1e-9) {
        cout << "invalid" << endl;
    } else {
        cout << "valid" << endl;
    }

    return 0;
}